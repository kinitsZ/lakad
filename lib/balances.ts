export type Balance = { memberId: string; cents: number };

/**
 * Net position per member: positive means the group owes them, negative means
 * they owe the group. Recorded payments move the needle back toward zero.
 */
export function computeBalances({
  expenses,
  splits,
  payments,
  memberIds,
}: {
  expenses: { id: string; paidBy: string; amountCents: number }[];
  splits: { expenseId: string; memberId: string; shareCents: number }[];
  payments: { fromMemberId: string; toMemberId: string; amountCents: number }[];
  memberIds: string[];
}): Balance[] {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (id: string, cents: number) => {
    if (net.has(id)) net.set(id, (net.get(id) ?? 0) + cents);
  };

  for (const expense of expenses) add(expense.paidBy, expense.amountCents);
  for (const split of splits) add(split.memberId, -split.shareCents);
  for (const payment of payments) {
    add(payment.fromMemberId, payment.amountCents);
    add(payment.toMemberId, -payment.amountCents);
  }

  return memberIds.map((memberId) => ({ memberId, cents: net.get(memberId) ?? 0 }));
}

export type Transfer = { fromMemberId: string; toMemberId: string; amountCents: number };

/**
 * Fewest payments that clear every balance: repeatedly settle the biggest
 * debtor against the biggest creditor. Never needs more than n-1 transfers.
 */
export function settleUp(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.cents < 0)
    .map((b) => ({ ...b, cents: -b.cents }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = balances
    .filter((b) => b.cents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.cents - a.cents);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].cents, creditors[j].cents);
    if (amount > 0) {
      transfers.push({
        fromMemberId: debtors[i].memberId,
        toMemberId: creditors[j].memberId,
        amountCents: amount,
      });
    }
    debtors[i].cents -= amount;
    creditors[j].cents -= amount;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }

  return transfers;
}

/** How many payments it would take with no netting — one per share owed. */
export function naivePaymentCount(
  expenses: { id: string; paidBy: string }[],
  splits: { expenseId: string; memberId: string }[],
): number {
  const payerByExpense = new Map(expenses.map((e) => [e.id, e.paidBy]));
  const pairs = new Set<string>();
  for (const split of splits) {
    const payer = payerByExpense.get(split.expenseId);
    if (payer && payer !== split.memberId) pairs.add(`${split.memberId}->${payer}`);
  }
  return pairs.size;
}
