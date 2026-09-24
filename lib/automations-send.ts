import "server-only";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  dateVoteSubmissions,
  expenseSplits,
  expenses,
  members,
  outbox,
  payments,
  trips,
  type OutboxRow,
} from "@/db/schema";
import { OUTBOX } from "@/lib/automations";
import { computeBalances, settleUp } from "@/lib/balances";
import { addDays, deadlineLabel, rangeLabel } from "@/lib/format";
import { moneyExact } from "@/lib/money";

/**
 * The runner (n8n) never touches the database. It calls the tick endpoint, gets
 * finished emails from `prepareOutgoing`, sends them, and reports back with
 * `reportResults`. Recipients are worked out at send time, so someone who joined
 * or voted after a job was queued is handled correctly.
 */

export type OutgoingEmail = {
  jobId: string;
  kind: string;
  to: string;
  toName: string;
  subject: string;
  text: string;
  html: string;
  /** Base64 file content, e.g. the .ics for a calendar invite. */
  attachment?: { filename: string; mimeType: string; base64: string };
};

/** A claimed job reappears if it isn't reported within this window (e.g. the runner crashed). */
const LEASE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const BATCH = 20;

async function claimDueJobs(): Promise<OutboxRow[]> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(outbox)
      .where(and(eq(outbox.status, "pending"), lte(outbox.runAfter, new Date())))
      .orderBy(asc(outbox.runAfter))
      .limit(BATCH)
      .for("update", { skipLocked: true });
    if (!due.length) return [];

    await tx
      .update(outbox)
      .set({
        runAfter: new Date(Date.now() + LEASE_MINUTES * 60 * 1000),
        attempts: sql`${outbox.attempts} + 1`,
      })
      .where(
        inArray(
          outbox.id,
          due.map((job) => job.id),
        ),
      );
    return due.map((job) => ({ ...job, attempts: job.attempts + 1 }));
  });
}

async function markSkipped(jobId: string, reason: string) {
  await db
    .update(outbox)
    .set({ status: "done", processedAt: new Date(), lastError: `skipped: ${reason}` })
    .where(eq(outbox.id, jobId));
}

/** Claims due jobs and turns each into ready-to-send emails. */
export async function prepareOutgoing(origin: string) {
  const jobs = await claimDueJobs();
  const emails: OutgoingEmail[] = [];
  const skipped: { jobId: string; kind: string; reason: string }[] = [];

  for (const job of jobs) {
    const result = await render(job, origin);
    if ("skip" in result) {
      await markSkipped(job.id, result.skip);
      skipped.push({ jobId: job.id, kind: job.kind, reason: result.skip });
    } else {
      emails.push(...result.emails);
    }
  }
  return { emails, skipped };
}

/** A job succeeds only if every one of its emails went out; failures retry with backoff. */
export async function reportResults(results: { jobId: string; ok: boolean; error?: string }[]) {
  const byJob = new Map<string, { ok: boolean; error?: string }>();
  for (const r of results) {
    const prev = byJob.get(r.jobId);
    byJob.set(r.jobId, {
      ok: (prev?.ok ?? true) && r.ok,
      error: prev?.error ?? (r.ok ? undefined : (r.error ?? "send failed")),
    });
  }

  let done = 0;
  let retrying = 0;
  let failed = 0;
  for (const [jobId, outcome] of byJob) {
    const [job] = await db.select().from(outbox).where(eq(outbox.id, jobId)).limit(1);
    if (!job || job.status !== "pending") continue;

    if (outcome.ok) {
      await db
        .update(outbox)
        .set({ status: "done", processedAt: new Date(), lastError: null })
        .where(eq(outbox.id, jobId));
      done++;
    } else if (job.attempts >= MAX_ATTEMPTS) {
      await db
        .update(outbox)
        .set({ status: "failed", processedAt: new Date(), lastError: outcome.error })
        .where(eq(outbox.id, jobId));
      failed++;
    } else {
      await db
        .update(outbox)
        .set({
          runAfter: new Date(Date.now() + job.attempts * 10 * 60 * 1000),
          lastError: outcome.error,
        })
        .where(eq(outbox.id, jobId));
      retrying++;
    }
  }
  return { done, retrying, failed };
}

/* -------------------------------------------------------------- rendering */

type Rendered = { emails: OutgoingEmail[] } | { skip: string };

async function render(job: OutboxRow, origin: string): Promise<Rendered> {
  const [trip] = await db.select().from(trips).where(eq(trips.id, job.tripId)).limit(1);
  if (!trip) return { skip: "trip no longer exists" };
  if (!trip.automationsEnabled) return { skip: "automations are turned off for this trip" };

  const roster = await db
    .select({ id: members.id, name: members.name, email: members.email })
    .from(members)
    .where(eq(members.tripId, trip.id));
  const withEmail = roster.filter(
    (m): m is typeof m & { email: string } => Boolean(m.email) && !isPlaceholder(m.email!),
  );
  const tripUrl = `${origin}/trip/${trip.slug}`;
  const first = (name: string) => name.split(" ")[0];

  const email = (
    to: { email: string; name: string },
    subject: string,
    lines: string[],
    cta: { label: string; url: string },
    attachment?: OutgoingEmail["attachment"],
  ): OutgoingEmail => ({
    jobId: job.id,
    kind: job.kind,
    to: to.email,
    toName: to.name,
    subject,
    text: [`Hi ${first(to.name)},`, "", ...lines, "", `${cta.label}: ${cta.url}`, "", "— Lakad"].join(
      "\n",
    ),
    html: htmlEmail(`Hi ${first(to.name)},`, lines, cta),
    attachment,
  });

  switch (job.kind) {
    case OUTBOX.voteReminder: {
      if (trip.phase !== "voting") return { skip: "voting has already closed" };
      const voted = await db
        .select({ memberId: dateVoteSubmissions.memberId })
        .from(dateVoteSubmissions)
        .where(eq(dateVoteSubmissions.tripId, trip.id));
      const votedIds = new Set(voted.map((v) => v.memberId));
      const recipients = withEmail.filter((m) => !votedIds.has(m.id));
      if (!recipients.length) return { skip: "everyone with an email has voted" };

      return {
        emails: recipients.map((m) =>
          email(
            m,
            `Voting on ${trip.name} closes soon`,
            [
              `Voting on dates for ${trip.name} closes ${deadlineLabel(trip.votingDeadline)}.`,
              "Mark the days you're free so the group can lock the best range.",
            ],
            { label: "Pick your days", url: `${tripUrl}/dates` },
          ),
        ),
      };
    }

    case OUTBOX.calendarInvite: {
      if (!trip.lockedStart || !trip.lockedEnd) return { skip: "dates aren't locked" };
      if (!withEmail.length) return { skip: "nobody on the trip has added an email" };
      const range = rangeLabel(trip.lockedStart, trip.lockedEnd);
      const ics = icsFile({
        uid: `${trip.id}@lakad`,
        title: trip.name,
        start: trip.lockedStart,
        end: trip.lockedEnd,
        url: tripUrl,
      });

      return {
        emails: withEmail.map((m) =>
          email(
            m,
            `${trip.name} is on: ${range}`,
            [
              `The dates for ${trip.name} are locked: ${range}.`,
              "Open the attached invite to add it to your calendar.",
            ],
            { label: "Open the trip", url: tripUrl },
            {
              filename: "lakad-trip.ics",
              mimeType: "text/calendar",
              base64: Buffer.from(ics).toString("base64"),
            },
          ),
        ),
      };
    }

    case OUTBOX.paymentReminder: {
      const transfers = await currentTransfers(trip.id, roster.map((m) => m.id));
      // A reminder for one person (the "Remind" button) or everyone who owes (after an expense).
      const target = (job.payload as { memberId?: string }).memberId;
      const debtors = withEmail.filter(
        (m) => (!target || m.id === target) && transfers.some((t) => t.fromMemberId === m.id),
      );
      if (!debtors.length) return { skip: "nobody with an email still owes money" };

      const nameOf = new Map(roster.map((m) => [m.id, first(m.name)]));
      return {
        emails: debtors.map((m) => {
          const owed = transfers.filter((t) => t.fromMemberId === m.id);
          const total = owed.reduce((sum, t) => sum + t.amountCents, 0);
          const parts = owed.map(
            (t) => `${moneyExact(t.amountCents)} to ${nameOf.get(t.toMemberId) ?? "someone"}`,
          );
          return email(
            m,
            `You owe ${moneyExact(total)} for ${trip.name}`,
            [
              `To settle up for ${trip.name}, you owe ${parts.join(" and ")}.`,
              "Once you've paid, tap “Mark as paid” so everyone's balances update.",
            ],
            { label: "Settle up", url: `${tripUrl}/expenses/settle` },
          );
        }),
      };
    }

    default:
      return { skip: `no email is set up for "${job.kind}" yet` };
  }
}

async function currentTransfers(tripId: string, memberIds: string[]) {
  const [expenseRows, splitRows, paymentRows] = await Promise.all([
    db
      .select({ id: expenses.id, paidBy: expenses.paidBy, amountCents: expenses.amountCents })
      .from(expenses)
      .where(eq(expenses.tripId, tripId)),
    db
      .select({
        expenseId: expenseSplits.expenseId,
        memberId: expenseSplits.memberId,
        shareCents: expenseSplits.shareCents,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(eq(expenses.tripId, tripId)),
    db
      .select({
        fromMemberId: payments.fromMemberId,
        toMemberId: payments.toMemberId,
        amountCents: payments.amountCents,
      })
      .from(payments)
      .where(eq(payments.tripId, tripId)),
  ]);
  return settleUp(
    computeBalances({
      expenses: expenseRows,
      splits: splitRows,
      payments: paymentRows,
      memberIds,
    }),
  );
}

/** Reserved example/test domains (RFC 2606), used by the demo seed. Never mail them. */
const isPlaceholder = (address: string) =>
  /@(?:[\w-]+\.)*(?:example\.(?:com|net|org)|example|test|invalid|localhost)$/i.test(address);

/* ------------------------------------------------------------ formatting */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function htmlEmail(greeting: string, lines: string[], cta: { label: string; url: string }) {
  const paragraphs = [greeting, ...lines]
    .map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`)
    .join("");
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#231f1c;max-width:480px">${paragraphs}<p style="margin:20px 0"><a href="${escapeHtml(cta.url)}" style="background:#c8643b;color:#fffdfb;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p><p style="margin:0;color:#6f665e;font-size:13px">— Lakad</p></div>`;
}

/** An all-day event over the trip's dates (DTEND is exclusive in iCalendar). */
function icsFile(event: { uid: string; title: string; start: string; end: string; url: string }) {
  const text = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const day = (iso: string) => iso.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lakad//Trips//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(event.start)}`,
    `DTEND;VALUE=DATE:${day(addDays(event.end, 1))}`,
    `SUMMARY:${text(event.title)}`,
    `URL:${event.url}`,
    "DESCRIPTION:Planned with Lakad",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
