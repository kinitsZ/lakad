"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addExpense } from "@/app/actions/expenses";
import { Avatar } from "@/components/ui";
import type { MemberView } from "@/db/queries";
import { money, moneyExact } from "@/lib/money";

export type ExpenseRow = {
  id: string;
  title: string;
  amountCents: number;
  paidBy: string;
  paidByName: string | null;
  splitCount: number;
  perPersonCents: number;
  evenSplit: boolean;
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
                    {mine > 0 ? "You get back" : "You owe"}
                  </h2>
                  <div
                    className={`font-display font-semibold text-[20px] ${
                      mine === 0 ? "text-ink2" : mine > 0 ? "text-ok" : "text-warn"
                    }`}
                  >
                    {mine === 0 ? "Nothing" : moneyExact(mine)}
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-[11px] text-ink2 mb-2 uppercase">Balances</h3>
              <div className="flex flex-col gap-[7px] stagger-children">
                {others.map((balance) => {
                  const member = byId.get(balance.memberId);
                  const owes = balance.cents < 0;
                  if (!member) return null;
                  return (
                    <div key={balance.memberId} className="flex items-center gap-[9px]">
                      <Avatar member={member} size={22} />
                      <div className="font-medium text-[12px] w-14 truncate">
                        {member.name.split(" ")[0]}
                      </div>
                      <div className="flex-1 h-[7px] rounded bg-surface2 overflow-hidden">
                        <div
                          className={`h-full ${owes ? "bg-warn" : "bg-ok"} origin-left animate-grow transition-[width] duration-500`}
                          style={{
                            width: `${Math.round((Math.abs(balance.cents) / widest) * 100)}%`,
                          }}
                        />
                      </div>
                      <div
                        className={`font-semibold text-[12px] w-[72px] text-right tabular-nums ${
                          owes ? "text-warn" : balance.cents > 0 ? "text-ok" : "text-ink2"
                        }`}
                      >
                        {balance.cents === 0
                          ? "even"
                          : `${owes ? "−" : "+"}${moneyExact(balance.cents)}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {unpaid > 0 && (
                <div className="flex items-center gap-2 bg-warn-soft rounded-xl px-[11px] py-2.5 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                  <div className="font-medium text-[11px] text-ink">
                    {unpaid} {unpaid === 1 ? "person still owes" : "people still owe"} money ·
                    reminder scheduled
                  </div>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-[9px] lg:col-start-1 lg:row-start-1 lg:row-span-2 stagger-children">
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
                        {payer?.name.split(" ")[0] ?? "Someone"} paid ·{" "}
                        {expense.evenSplit
                          ? `split ${expense.splitCount} ways`
                          : `custom split, ${expense.splitCount} people`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-[14px]">
                        {money(expense.amountCents)}
                      </div>
                      <div className="text-[11px] text-ink2">
                        {expense.evenSplit ? `${money(expense.perPersonCents)} each` : "varies"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {transferCount > 0 && (
              <Link
                href={`/trip/${slug}/expenses/settle`}
                transitionTypes={["nav-forward"]}
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

// 16px on phones: iOS Safari zooms the page into any field smaller than that.
const field =
  "w-full h-11 bg-bg border border-line rounded-xl px-3 text-[16px] lg:text-[14px] outline-none focus:border-accent placeholder:text-ink2/60";
const fieldLabel = "block font-semibold text-[11px] text-ink2 mb-1.5";

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
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState(() => new Set(members.map((m) => m.id)));
  const [mode, setMode] = useState<"even" | "custom">("even");
  const [shares, setShares] = useState<Record<string, string>>({});

  const totalCents = toCents(amount);
  const chosen = members.filter((m) => selected.has(m.id));
  const assignedCents = chosen.reduce((sum, m) => sum + (toCents(shares[m.id] ?? "") || 0), 0);
  const leftCents = (totalCents || 0) - assignedCents;
  const customReady = mode === "even" || (totalCents > 0 && leftCents === 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="bg-surface border border-line rounded-[16px] p-4 flex flex-col gap-3 animate-rise"
      action={(formData) =>
        start(async () => {
          setError(null);
          formData.set("amountCents", String(totalCents));
          if (mode === "custom") {
            const custom = Object.fromEntries(
              chosen.map((m) => [m.id, toCents(shares[m.id] ?? "") || 0]),
            );
            formData.set("customShares", JSON.stringify(custom));
          }
          const result = await addExpense(tripId, formData);
          if (result?.error) setError(result.error);
          else onDone();
        })
      }
    >
      <div className="flex gap-3">
        <label className="flex-1 min-w-0">
          <span className={fieldLabel}>What for</span>
          <input name="title" required placeholder="Deposit, groceries, taxi…" className={field} />
        </label>
        <label className="w-[132px] shrink-0">
          <span className={fieldLabel}>Amount</span>
          <MoneyInput
            name="amount"
            required
            value={amount}
            onChange={setAmount}
            ariaLabel="Amount"
          />
        </label>
      </div>

      <label>
        <span className={fieldLabel}>Paid by</span>
        <span className="relative block">
          <select
            name="paidBy"
            defaultValue={currentMemberId}
            className={`${field} appearance-none pr-9 cursor-pointer`}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink2 pointer-events-none"
          >
            <path
              d="M2.5 4.5 6 8l3.5-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </label>

      <fieldset>
        <div className="flex items-center justify-between mb-1.5">
          <legend className="font-semibold text-[11px] text-ink2">Split between</legend>
          <div className="flex bg-bg border border-line rounded-full p-0.5" role="radiogroup">
            {(["even", "custom"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                onClick={() => setMode(option)}
                className={`rounded-full px-2.5 py-1 font-semibold text-[11px] cursor-pointer ${
                  mode === option ? "bg-accent text-accent-ink" : "text-ink2"
                }`}
              >
                {option === "even" ? "Split evenly" : "Custom amounts"}
              </button>
            ))}
          </div>
        </div>
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
                checked={selected.has(member.id)}
                onChange={() => toggle(member.id)}
                className="accent-accent"
              />
              {member.name.split(" ")[0]}
            </label>
          ))}
        </div>

        {mode === "even" && totalCents > 0 && chosen.length > 0 && (
          <p className="text-[12px] text-ink2 mt-2">
            {moneyExact(Math.floor(totalCents / chosen.length))} each
          </p>
        )}

        {mode === "custom" && (
          <div className="flex flex-col gap-2 mt-3">
            {chosen.map((member) => (
              <div key={member.id} className="flex items-center gap-3 animate-rise">
                <span className="flex-1 min-w-0 truncate text-[14px]">{member.name}</span>
                <span className="w-[132px] shrink-0">
                  <MoneyInput
                    value={shares[member.id] ?? ""}
                    onChange={(value) => setShares((prev) => ({ ...prev, [member.id]: value }))}
                    ariaLabel={`${member.name}'s share`}
                  />
                </span>
              </div>
            ))}
            {chosen.length > 0 && (
              <p
                className={`text-[12px] text-right ${
                  leftCents === 0 && totalCents > 0 ? "text-ok" : "text-warn"
                }`}
              >
                {!totalCents
                  ? "Enter the total amount first"
                  : leftCents === 0
                    ? "Adds up ✓"
                    : leftCents > 0
                      ? `${moneyExact(leftCents)} left to assign`
                      : `${moneyExact(-leftCents)} too much`}
              </p>
            )}
          </div>
        )}
      </fieldset>

      {error && <p className="text-[12px] text-warn">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !customReady || chosen.length === 0}
          className="bg-accent text-accent-ink rounded-xl h-11 px-5 font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border border-line rounded-xl h-11 px-5 font-semibold text-[13px] text-ink2 cursor-pointer hover:border-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** "12.5" → 1250 cents; anything unusable → 0. */
function toCents(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

function MoneyInput({
  name,
  value,
  onChange,
  required,
  ariaLabel,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  ariaLabel: string;
}) {
  return (
    <span className="relative block">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] lg:text-[14px] text-ink2 pointer-events-none">
        $
      </span>
      <input
        name={name}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        required={required}
        placeholder="0.00"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${field} pl-7 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
    </span>
  );
}

export function ExpensesEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed border-line rounded-[20px] px-[18px] py-[26px] text-center bg-surface">
      <div className="w-[42px] h-[42px] rounded-[14px] bg-surface2 mx-auto mb-3" />
      <h2 className="font-display font-semibold text-[16px] mb-[5px]">Nothing spent yet</h2>
      <p className="text-[12px] leading-[1.5] text-ink2 mb-3.5">
        Add the first expense and Lakad keeps every balance up to date — no spreadsheets.
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
