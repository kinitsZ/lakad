import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expenseSplits, expenses, members, payments, type Member } from "@/db/schema";
import { OUTBOX, enqueue, recordUpdate, schedulePaymentReminder } from "@/lib/automations";
import { money, moneyExact, splitEvenly } from "@/lib/money";

type Result<T = object> = ({ ok: true; error?: undefined } & T) | { ok?: undefined; error: string };

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "What was it for?").max(80),
  amountCents: z.coerce.number().int().positive("Enter an amount"),
  paidBy: z.string().uuid(),
  splitBetween: z.array(z.string().uuid()).min(1, "Split it between at least one person"),
  /** memberId → cents. Absent means split evenly. */
  customShares: z.record(z.string().uuid(), z.number().int().nonnegative()).optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const paymentSchema = z.object({
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amountCents: z.coerce.number().int().positive(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

async function rosterOf(tripId: string) {
  const rows = await db
    .select({ id: members.id, name: members.name, email: members.email })
    .from(members)
    .where(eq(members.tripId, tripId));
  return new Map(rows.map((m) => [m.id, m]));
}

export async function addExpense(tripId: string, actor: Member, input: ExpenseInput): Promise<Result> {
  // Everyone named has to actually be on this trip.
  const roster = await rosterOf(tripId);
  const participants = input.splitBetween.filter((id) => roster.has(id));
  if (!roster.has(input.paidBy) || !participants.length) {
    return { error: "Those people aren't all on this trip." };
  }

  let split: { memberId: string; shareCents: number }[];
  if (input.customShares) {
    const custom = input.customShares;
    split = participants
      .map((memberId) => ({ memberId, shareCents: custom[memberId] ?? 0 }))
      .filter((row) => row.shareCents > 0);
    const sum = split.reduce((total, row) => total + row.shareCents, 0);
    if (!split.length) return { error: "Give at least one person a share." };
    if (sum !== input.amountCents) {
      return {
        error: `The shares add up to ${moneyExact(sum)}, but the expense is ${moneyExact(input.amountCents)}.`,
      };
    }
  } else {
    const shares = splitEvenly(input.amountCents, participants.length);
    split = participants.map((memberId, i) => ({ memberId, shareCents: shares[i] }));
  }

  await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({ tripId, title: input.title, amountCents: input.amountCents, paidBy: input.paidBy })
      .returning();

    await tx.insert(expenseSplits).values(
      split.map((row) => ({ expenseId: expense.id, ...row })),
    );

    await schedulePaymentReminder(tripId);
  });

  await recordUpdate({
    tripId,
    kind: "expense_added",
    icon: "$",
    memberId: actor.id,
    title: `${actor.name} added ${input.title}`,
    body: input.customShares
      ? `${money(input.amountCents)}, custom split between ${split.length}`
      : `${money(input.amountCents)} split ${split.length} ways`,
  });

  return { ok: true };
}

/** Only the two people in a payment can say it happened. */
export async function recordPayment(
  tripId: string,
  actorId: string,
  input: PaymentInput,
): Promise<Result> {
  if (input.fromMemberId === input.toMemberId) return { error: "Someone can't pay themselves." };
  if (actorId !== input.fromMemberId && actorId !== input.toMemberId) {
    return { error: "Only the people in this payment can mark it as paid." };
  }

  const roster = await rosterOf(tripId);
  const from = roster.get(input.fromMemberId);
  const to = roster.get(input.toMemberId);
  if (!from || !to) return { error: "Those people aren't all on this trip." };

  await db.insert(payments).values({ tripId, ...input });

  await recordUpdate({
    tripId,
    kind: "payment_recorded",
    icon: "$",
    title: `${from.name} paid ${to.name}`,
    body: money(input.amountCents),
  });

  return { ok: true };
}

export async function deleteExpense(tripId: string, expenseId: string) {
  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)));
}

/** Queues a nudge for someone who still owes money; the automation runner sends it. */
export async function queuePaymentReminder(
  tripId: string,
  actorId: string,
  debtorId: string,
  amountCents: number,
): Promise<Result<{ queuedFor: string }>> {
  if (actorId === debtorId) return { error: "You can't send yourself a reminder." };

  const debtor = (await rosterOf(tripId)).get(debtorId);
  if (!debtor) return { error: "They aren't on this trip." };

  await enqueue({
    tripId,
    kind: OUTBOX.paymentReminder,
    payload: { memberId: debtor.id, name: debtor.name, email: debtor.email, amountCents },
    // One nudge per person per day, however many times the button is pressed.
    dedupeKey: `${OUTBOX.paymentReminder}:${debtor.id}:${new Date().toISOString().slice(0, 10)}`,
  });

  return { ok: true, queuedFor: debtor.name.split(" ")[0] };
}
