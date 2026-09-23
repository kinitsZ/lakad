"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { recordPayment, remindDebtor } from "@/app/actions/expenses";
import { Avatar } from "@/components/ui";
import type { MemberView } from "@/db/queries";
import type { Transfer } from "@/lib/balances";
import { moneyExact } from "@/lib/money";

export type SettledPayment = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  paidAt: Date;
};

export function SettleUp({
  slug,
  tripId,
  transfers,
  payments,
  members,
  naivePayments,
}: {
  slug: string;
  tripId: string;
  transfers: Transfer[];
  payments: SettledPayment[];
  members: MemberView[];
  naivePayments: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reminded, setReminded] = useState<string | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const name = (id: string) => byId.get(id)?.name.split(" ")[0] ?? "Someone";

  function markPaid(transfer: Transfer) {
    setError(null);
    start(async () => {
      const result = await recordPayment(tripId, transfer);
      if (result?.error) setError(result.error);
    });
  }

  function remind(transfer: Transfer) {
    setError(null);
    start(async () => {
      const result = await remindDebtor(
        tripId,
        transfer.fromMemberId,
        transfer.amountCents,
      );
      if (result?.error) setError(result.error);
      else setReminded(transfer.fromMemberId);
    });
  }

  return (
    <div className="mx-auto w-full max-w-[430px] lg:max-w-[760px] lg:px-6 lg:py-8">
      <header className="px-5 lg:px-0 pt-3 lg:pt-0 pb-2.5 lg:pb-6 flex items-center justify-between">
        <Link
          href={`/trip/${slug}/expenses`}
          className="font-medium text-[14px] text-ink2 hover:text-ink lg:order-2"
        >
          Back to expenses
        </Link>
        <h1 className="font-display font-semibold text-[15px] lg:text-[32px] lg:tracking-[-0.025em] lg:order-1 lg:mr-auto">
          Settle up
        </h1>
        <div className="w-[34px] lg:hidden" aria-hidden />
      </header>

      <div className="px-5 lg:px-0 pb-8 lg:pb-0 flex flex-col gap-3">
        {transfers.length ? (
          <p className="bg-surface2 rounded-[16px] px-[15px] lg:px-5 py-[13px] lg:py-4 text-[12px] lg:text-[14px] leading-[1.5] text-ink">
            To make everyone even, only{" "}
            <strong>
              {transfers.length} payment{transfers.length === 1 ? " is" : "s are"} needed
            </strong>
            {naivePayments > transfers.length && ` (instead of ${naivePayments})`}. Once one is
            made, tap &ldquo;Mark as paid&rdquo;.
          </p>
        ) : (
          <p className="bg-ok-soft rounded-[16px] px-[15px] lg:px-5 py-[13px] lg:py-4 text-[12px] lg:text-[14px] text-ink">
            Everyone&rsquo;s even — nobody owes anything.
          </p>
        )}

        {error && (
          <p className="bg-warn-soft text-ink rounded-[14px] px-3.5 py-3 text-[12px]">{error}</p>
        )}

        <div className="flex flex-col gap-2.5">
          {transfers.map((transfer, index) => {
            const from = byId.get(transfer.fromMemberId);
            const to = byId.get(transfer.toMemberId);
            const expanded = index === 0;
            return (
              <div
                key={`${transfer.fromMemberId}-${transfer.toMemberId}`}
                className="bg-surface border border-line rounded-[18px] px-[15px] lg:px-5 py-3.5 lg:py-4"
              >
                <div
                  className={`flex items-center gap-2.5 lg:gap-3.5 ${expanded ? "mb-2.5" : ""}`}
                >
                  <Avatar member={from} size={30} />
                  <span className="font-semibold text-[13px] text-ink2" aria-hidden>
                    →
                  </span>
                  <Avatar member={to} size={30} />
                  <div className="flex-1 font-medium text-[13px] min-w-0 truncate">
                    {name(transfer.fromMemberId)} pays {name(transfer.toMemberId)}
                  </div>
                  <div className="font-display font-semibold text-[15px] shrink-0">
                    {moneyExact(transfer.amountCents)}
                  </div>
                </div>
                {expanded && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => markPaid(transfer)}
                      className="bg-ink text-bg rounded-[11px] px-[13px] py-2 font-semibold text-[11px] cursor-pointer hover:opacity-90 disabled:opacity-60"
                    >
                      {pending ? "Saving…" : "Mark as paid"}
                    </button>
                    <button
                      type="button"
                      disabled={pending || reminded === transfer.fromMemberId}
                      onClick={() => remind(transfer)}
                      className="border border-line rounded-[11px] px-[13px] py-2 font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent hover:text-ink disabled:opacity-60 disabled:cursor-default"
                    >
                      {reminded === transfer.fromMemberId
                        ? "Reminder queued ✓"
                        : `Remind ${name(transfer.fromMemberId)}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-surface border border-line rounded-[18px] px-[15px] lg:px-5 py-3.5 lg:py-4 flex items-center gap-2.5 lg:gap-3.5 opacity-65"
            >
              <Avatar member={byId.get(payment.fromMemberId)} size={30} />
              <span className="font-semibold text-[13px] text-ink2" aria-hidden>
                →
              </span>
              <Avatar member={byId.get(payment.toMemberId)} size={30} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[13px] truncate">
                  {name(payment.fromMemberId)} paid {name(payment.toMemberId)}
                </div>
                <div className="text-[11px] text-ok">
                  Paid {payment.paidAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <div className="font-display font-semibold text-[15px] shrink-0">
                {moneyExact(payment.amountCents)}
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-[9px] bg-accent-soft rounded-[14px] px-3.5 lg:px-5 py-3 lg:py-4">
          <span className="w-[7px] h-[7px] shrink-0 rounded-full bg-accent" />
          <span className="text-[12px] leading-[1.45] text-ink">
            A settle-up summary is queued for everyone when the trip is marked Done.
          </span>
        </p>
      </div>
    </div>
  );
}
