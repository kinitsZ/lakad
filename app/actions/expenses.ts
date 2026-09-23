"use server";

import { refreshTrip } from "@/app/actions/revalidate";
import * as expensesLib from "@/lib/expenses";
import { requireMember } from "@/lib/session";

export async function addExpense(tripId: string, formData: FormData) {
  const member = await requireMember(tripId);
  const parsed = expensesLib.expenseSchema.safeParse({
    title: formData.get("title"),
    amountCents: formData.get("amountCents"),
    paidBy: formData.get("paidBy"),
    splitBetween: formData.getAll("splitBetween"),
    customShares: parseShares(formData.get("customShares")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const result = await expensesLib.addExpense(tripId, member, parsed.data);
  if ("ok" in result) refreshTrip();
  return result;
}

export async function recordPayment(tripId: string, input: unknown) {
  const member = await requireMember(tripId);
  const parsed = expensesLib.paymentSchema.safeParse(input);
  if (!parsed.success) return { error: "That payment didn't look right." };

  const result = await expensesLib.recordPayment(tripId, member.id, parsed.data);
  if ("ok" in result) refreshTrip();
  return result;
}

export async function deleteExpense(tripId: string, expenseId: string) {
  await requireMember(tripId);
  await expensesLib.deleteExpense(tripId, expenseId);
  refreshTrip();
  return { ok: true };
}

export async function remindDebtor(tripId: string, debtorId: string, amountCents: number) {
  const member = await requireMember(tripId);
  const result = await expensesLib.queuePaymentReminder(tripId, member.id, debtorId, amountCents);
  if ("ok" in result) refreshTrip();
  return result;
}

function parseShares(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null; // fails validation with a clear error instead of being ignored
  }
}
