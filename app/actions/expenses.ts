"use server";

import { and, eq } from "drizzle-orm";
import { refreshTrip } from "@/app/actions/revalidate";
import { z } from "zod";
import { db } from "@/db";
import { expenseSplits, expenses, members, payments } from "@/db/schema";
import { OUTBOX, enqueue, recordUpdate, schedulePaymentReminder } from "@/lib/automations";
import { money, splitEvenly } from "@/lib/money";
import { requireMember } from "@/lib/session";

const expenseSchema = z.object({
  title: z.string().trim().min(1, "What was it for?").max(80),
  amountCents: z.coerce.number().int().positive("Enter an amount"),
  paidBy: z.string().uuid(),
  splitBetween: z.array(z.string().uuid()).min(1, "Split it between at least one person"),
});

export async function addExpense(tripId: string, formData: FormData) {
  const member = await requireMember(tripId);
  const parsed = expenseSchema.safeParse({
    title: formData.get("title"),
    amountCents: formData.get("amountCents"),
    paidBy: formData.get("paidBy"),
    splitBetween: formData.getAll("splitBetween"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  // Everyone named has to actually be on this trip.
  const roster = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.tripId, tripId));
  const valid = new Set(roster.map((m) => m.id));
  const participants = parsed.data.splitBetween.filter((id) => valid.has(id));
  if (!valid.has(parsed.data.paidBy) || !participants.length) {
    return { error: "Those people aren't all on this trip." };
  }

  const shares = splitEvenly(parsed.data.amountCents, participants.length);

  await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        tripId,
        title: parsed.data.title,
        amountCents: parsed.data.amountCents,
        paidBy: parsed.data.paidBy,
      })
      .returning();

    await tx.insert(expenseSplits).values(
      participants.map((memberId, i) => ({
        expenseId: expense.id,
        memberId,
        shareCents: shares[i],
      })),
    );

    await schedulePaymentReminder(tripId, expense.id);
  });

  await recordUpdate({
    tripId,
    kind: "expense_added",
    icon: "$",
    memberId: member.id,
    title: `${member.name} added ${parsed.data.title}`,
    body: `${money(parsed.data.amountCents)} split ${participants.length} ways`,
  });

  refreshTrip();
  return { ok: true };
}

const paymentSchema = z.object({
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amountCents: z.coerce.number().int().positive(),
});

export async function recordPayment(tripId: string, input: unknown) {
  await requireMember(tripId);
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { error: "That payment didn't look right." };
  if (parsed.data.fromMemberId === parsed.data.toMemberId) {
    return { error: "Someone can't pay themselves." };
  }

  const roster = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(eq(members.tripId, tripId));
  const byId = new Map(roster.map((m) => [m.id, m.name]));
  if (!byId.has(parsed.data.fromMemberId) || !byId.has(parsed.data.toMemberId)) {
    return { error: "Those people aren't all on this trip." };
  }

  await db.insert(payments).values({ tripId, ...parsed.data });

  await recordUpdate({
    tripId,
    kind: "payment_recorded",
    icon: "$",
    title: `${byId.get(parsed.data.fromMemberId)} paid ${byId.get(parsed.data.toMemberId)}`,
    body: money(parsed.data.amountCents),
  });

  refreshTrip();
  return { ok: true };
}

export async function deleteExpense(tripId: string, expenseId: string) {
  await requireMember(tripId);
  await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)));
  refreshTrip();
  return { ok: true };
}

/** Queues a nudge for one person who still owes money. n8n does the sending. */
export async function remindDebtor(
  tripId: string,
  debtorId: string,
  amountCents: number,
) {
  await requireMember(tripId);

  const [debtor] = await db
    .select({ id: members.id, name: members.name, email: members.email })
    .from(members)
    .where(and(eq(members.id, debtorId), eq(members.tripId, tripId)))
    .limit(1);
  if (!debtor) return { error: "They aren't on this trip." };

  await enqueue({
    tripId,
    kind: OUTBOX.paymentReminder,
    payload: { memberId: debtor.id, name: debtor.name, email: debtor.email, amountCents },
    // One nudge per person per day, however many times the button is pressed.
    dedupeKey: `${OUTBOX.paymentReminder}:${debtor.id}:${new Date()
      .toISOString()
      .slice(0, 10)}`,
  });

  refreshTrip();
  return { ok: true, queuedFor: debtor.name.split(" ")[0] };
}
