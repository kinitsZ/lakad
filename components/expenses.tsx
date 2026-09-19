"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addExpense } from "@/app/actions/expenses";
import { Avatar } from "@/components/ui";
import type { MemberView } from "@/db/queries";
import { money, moneyExact, signedMoney } from "@/lib/money";

export type ExpenseRow = {
  id: string;
  title: string;
  amountCents: number;
  paidBy: string;
  paidByName: string | null;
  splitCount: number;
  perPersonCents: number;
};

export function Expenses({
  slug,
  tripId,
  members,
  currentMemberId,
  expenses,
  balances,
  totalCents,
  transferCount,
}: {
  slug: string;
  tripId: string;
  members: MemberView[];
  currentMemberId: string;
  expenses: ExpenseRow[];
  balances: { memberId: string; cents: number }[];
  totalCents: number;
  transferCount: number;
}) {
  const [adding, setAdding] = useState(false);
  const byId = new Map(members.map((m) => [m.id, m]));

  const mine = balances.find((b) => b.memberId === currentMemberId)?.cents ?? 0;
  const others = balances
    .filter((b) => b.memberId !== currentMemberId)
    .sort((a, b) => a.cents - b.cents);
  const widest = Math.max(...others.map((b) => Math.abs(b.cents)), 1);
  const unpaid = balances.filter((b) => b.cents < 0).length;

  return (
    <div className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] lg:px-6 lg:py-8">
      <header className="px-5 lg:px-0 pt-3 lg:pt-0 pb-2.5 lg:pb-6 flex items-center justify-between">
        <h1 className="font-display font-semibold text-[19px] lg:text-[32px] lg:tracking-[-0.025em]">
          Expenses
        </h1>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="font-semibold text-[12px] text-accent cursor-pointer lg:border lg:border-line lg:rounded-full lg:px-4 lg:py-2 lg:hover:border-accent"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </header>

      <div className="px-5 lg:px-0 pb-8 lg:pb-0 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
        {!expenses.length && !adding ? (
          <div className="lg:col-span-2 lg:max-w-[560px] lg:mx-auto lg:w-full">
            <ExpensesEmptyState onAdd={() => setAdding(true)} />
          </div>
        ) : (
          <>
            <section className="bg-surface border border-line rounded-[20px] p-[15px] lg:p-[18px] lg:col-start-2 lg:row-start-1">
              <div className="flex justify-between items-end mb-3 gap-3">
                <div>
                  <h2 className="font-semibold text-[11px] text-ink2 mb-1 uppercase">
                    Trip total
                  </h2>
                  <div className="font-display font-semibold text-[26px]">
                    {moneyExact(totalCents)}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="font-semibold text-[11px] text-ink2 mb-1 uppercase">
                    {mine === 0 ? "You're square" : mine > 0 ? "You are owed" : "You owe"}
                  </h2>
                  <div
                    className={`font-display font-semibold text-[20px] ${
                      mine === 0 ? "text-ink2" : mine > 0 ? "text-ok" : "text-warn"
                    }`}
                  >
                    {mine === 0 ? moneyExact(0) : signedMoney(mine)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[7px]">
                {others.map((balance) => {
                  const member = byId.get(balance.memberId);
                  const owes = balance.cents < 0;
                  if (!member) return null;
                  return (
                    <div key={balance.memberId} className="flex items-center gap-[9px]">
                      <Avatar member={member} size={22} />
                      <div className="font-medium text-[12px] w-11 truncate">
                        {member.name.split(" ")[0]}
                      </div>
                      <div className="flex-1 h-[7px] rounded bg-surface2 overflow-hidden">
                        <div
                          className={`h-full ${owes ? "bg-warn" : "bg-ok"}`}
                          style={{
                            width: `${Math.round((Math.abs(balance.cents) / widest) * 100)}%`,
                          }}
                        />
                      </div>
                      <div
                        className={`font-semibold text-[12px] w-[58px] text-right ${
                          owes ? "text-warn" : balance.cents > 0 ? "text-ok" : "text-ink2"
                        }`}
                      >
                        {balance.cents === 0 ? "settled" : signedMoney(balance.cents)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {unpaid > 0 && (
                <div className="flex items-center gap-2 bg-warn-soft rounded-xl px-[11px] py-2.5 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                  <div className="font-medium text-[11px] text-ink">
                    {unpaid} {unpaid === 1 ? "person hasn't" : "people haven't"} paid yet ·
                    reminder queued
                  </div>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-[9px] lg:col-start-1 lg:row-start-1 lg:row-span-2">
              <h2 className="sr-only">Expenses</h2>
              {adding && (
                <AddExpenseForm
                  tripId={tripId}
                  members={members}
                  currentMemberId={currentMemberId}
                  onDone={() => setAdding(false)}
                />
              )}
              {expenses.map((expense) => {
                const payer = byId.get(expense.paidBy);
                return (
                  <div
                    key={expense.id}
                    className="bg-surface border border-line rounded-[16px] px-3.5 lg:px-5 py-3 lg:py-4 flex items-center gap-3 lg:gap-4"
                  >
                    <Avatar member={payer} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] mb-0.5 truncate">
                        {expense.title}
                      </div>
                      <div className="text-[11px] text-ink2">
                        {payer?.name.split(" ")[0] ?? "Someone"} paid · split{" "}
                        {expense.splitCount} ways
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-[14px]">
                        {money(expense.amountCents)}
                      </div>
                      <div className="text-[11px] text-ink2">
                        {money(expense.perPersonCents)} each
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {transferCount > 0 && (
              <Link
                href={`/trip/${slug}/expenses/settle`}
                className="bg-accent text-accent-ink rounded-[16px] p-[15px] lg:p-[18px] flex items-center justify-between gap-3 hover:opacity-90 lg:col-start-2 lg:row-start-2"
              >
                <div className="font-semibold text-[15px]">Settle up</div>
                <div className="text-[12px] opacity-85">
                  {transferCount} {transferCount === 1 ? "payment clears" : "payments clear"}{" "}
                  everything
                </div>
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AddExpenseForm({
  tripId,
  members,
  currentMemberId,
  onDone,
}: {
  tripId: string;
  members: MemberView[];
  currentMemberId: string;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="bg-surface border border-line rounded-[16px] p-4 flex flex-col gap-3"
      action={(formData) =>
        start(async () => {
          setError(null);
          const amount = Number(formData.get("amount"));
          formData.set("amountCents", String(Math.round(amount * 100)));
          const result = await addExpense(tripId, formData);
          if (result?.error) setError(result.error);
          else onDone();
        })
      }
    >
      <div className="flex gap-3">
        <label className="flex-1">
          <span className="block font-semibold text-[11px] text-ink2 mb-1.5">What for</span>
          <input
            name="title"
            required
            placeholder="Deposit, groceries, taxi…"
            className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
          />
        </label>
        <label className="w-[120px] shrink-0">
          <span className="block font-semibold text-[11px] text-ink2 mb-1.5">Amount</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
          />
        </label>
      </div>

      <label>
        <span className="block font-semibold text-[11px] text-ink2 mb-1.5">Paid by</span>
        <select
          name="paidBy"
          defaultValue={currentMemberId}
          className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="font-semibold text-[11px] text-ink2 mb-1.5">Split between</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <label
              key={member.id}
              className="flex items-center gap-2 bg-bg border border-line rounded-full px-3 py-1.5 text-[12px] cursor-pointer has-checked:border-accent has-checked:text-accent"
            >
              <input
                type="checkbox"
                name="splitBetween"
                value={member.id}
                defaultChecked
                className="accent-accent"
              />
              {member.name.split(" ")[0]}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-[12px] text-warn">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-ink rounded-xl px-4 py-2.5 font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border border-line rounded-xl px-4 py-2.5 font-semibold text-[13px] text-ink2 cursor-pointer hover:border-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ExpensesEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed border-line rounded-[20px] px-[18px] py-[26px] text-center bg-surface">
      <div className="w-[42px] h-[42px] rounded-[14px] bg-surface2 mx-auto mb-3" />
      <h2 className="font-display font-semibold text-[16px] mb-[5px]">Nothing spent yet</h2>
      <p className="text-[12px] leading-[1.5] text-ink2 mb-3.5">
        Add the first expense and Tripsync keeps every balance up to date — no spreadsheets.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-block bg-accent text-accent-ink rounded-[13px] px-[18px] py-[11px] font-semibold text-[13px] cursor-pointer hover:opacity-90"
      >
        Add an expense
      </button>
    </div>
  );
}
