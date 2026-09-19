"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { submitDateVote } from "@/app/actions/voting";
import { AvatarStack } from "@/components/ui";
import type { MemberView } from "@/db/queries";
import { monthLabel, rangeLabel } from "@/lib/format";

const heatClass = ["bg-h0", "bg-h1", "bg-h2", "bg-h3"];
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
const RANGE_LENGTH = 4;

function heatLevel(count: number, total: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  const share = count / Math.max(total, 1);
  return share >= 0.8 ? 3 : share >= 0.5 ? 2 : 1;
}

/** Month grid starting Monday, padded to whole weeks. */
function monthGrid(votingMonth: string) {
  const first = new Date(`${votingMonth}T00:00:00Z`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;

  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function bestWindow(counts: Record<string, number>, days: string[]) {
  let best: { days: string[]; free: number; total: number } | null = null;
  for (let i = 0; i + RANGE_LENGTH <= days.length; i++) {
    const window = days.slice(i, i + RANGE_LENGTH);
    const values = window.map((day) => counts[day] ?? 0);
    const total = values.reduce((sum, n) => sum + n, 0);
    const free = Math.min(...values);
    if (!best || total > best.total || (total === best.total && free > best.free)) {
      best = { days: window, free, total };
    }
  }
  return best;
}

export function DateVoting({
  slug,
  tripId,
  votingMonth,
  counts,
  initialMyDays,
  members,
  organiserName,
  deadlineLabel,
  alreadySubmitted,
  locked,
}: {
  slug: string;
  tripId: string;
  votingMonth: string;
  counts: Record<string, number>;
  initialMyDays: string[];
  members: MemberView[];
  organiserName: string;
  deadlineLabel: string;
  alreadySubmitted: boolean;
  locked: boolean;
}) {
  const [myDays, setMyDays] = useState<string[]>(initialMyDays);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = members.length;

  // The stored counts already include this member's saved days, so strip them
  // out before layering the current selection back on.
  const othersCounts = useMemo(() => {
    const out: Record<string, number> = { ...counts };
    for (const day of initialMyDays) out[day] = Math.max((out[day] ?? 0) - 1, 0);
    return out;
  }, [counts, initialMyDays]);

  const liveCounts = useMemo(() => {
    const out: Record<string, number> = { ...othersCounts };
    for (const day of myDays) out[day] = (out[day] ?? 0) + 1;
    return out;
  }, [othersCounts, myDays]);

  const cells = useMemo(() => monthGrid(votingMonth), [votingMonth]);
  const days = useMemo(() => cells.filter((c): c is string => Boolean(c)), [cells]);
  const best = useMemo(() => bestWindow(liveCounts, days), [liveCounts, days]);

  const votedCount = members.filter((m) => m.votedOnDates).length + (submitted && !alreadySubmitted ? 1 : 0);
  const notVoted = members.filter((m) => !m.votedOnDates);

  function toggle(day: string) {
    setSubmitted(false);
    setMyDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  function save(days: string[]) {
    setError(null);
    start(async () => {
      const result = await submitDateVote(tripId, days);
      if (result?.error) setError(result.error);
      else setSubmitted(true);
    });
  }

  return (
    <div className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] lg:px-6 lg:py-8">
      <header className="flex items-center justify-between px-5 lg:px-0 pt-3 lg:pt-0 pb-2.5 lg:pb-6">
        <Link
          href={`/trip/${slug}`}
          className="font-medium text-[14px] text-ink2 hover:text-ink lg:hidden"
        >
          Back
        </Link>
        <h1 className="font-display font-semibold text-[15px] lg:text-[32px] lg:tracking-[-0.025em]">
          Which days work?
        </h1>
        <button
          type="button"
          onClick={() => save(myDays)}
          disabled={pending || locked}
          className="font-semibold text-[13px] text-accent cursor-pointer lg:hidden disabled:opacity-50"
        >
          Save
        </button>
      </header>

      <div className="px-5 lg:px-0 pb-8 lg:pb-0 flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:items-start">
        <div className="flex flex-col gap-3.5 lg:max-w-[640px]">
          <div className="bg-ink text-bg rounded-[16px] px-3.5 py-3 flex justify-between items-center gap-3">
            <div className="font-semibold text-[13px]">
              {locked ? "Dates are locked" : `Voting closes ${deadlineLabel}`}
            </div>
            <div className="text-[12px] opacity-70 shrink-0">
              {votedCount} / {total} voted
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-[17px]">
              {monthLabel(votingMonth)}
            </h2>
          </div>

          <div>
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {WEEKDAY_INITIALS.map((initial, i) => (
                <div key={i} aria-hidden className="text-center font-semibold text-[10px] text-ink2">
                  {initial}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="aspect-square" />;
                const count = liveCounts[day] ?? 0;
                const level = heatLevel(count, total);
                const mine = myDays.includes(day);
                const inBest = best?.days.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggle(day)}
                    disabled={locked}
                    aria-pressed={mine}
                    aria-label={`${Number(day.slice(8))} — ${count} free${mine ? ", you are free" : ""}`}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:cursor-default ${
                      heatClass[level]
                    } ${level === 3 ? "text-accent-ink" : "text-ink"} ${
                      inBest ? "border-[1.5px] border-accent" : "border border-transparent"
                    } ${mine ? "ring-2 ring-inset ring-accent" : ""}`}
                  >
                    <span className="font-semibold text-[13px] lg:text-[15px]">
                      {Number(day.slice(8))}
                    </span>
                    <span className="font-medium text-[9px] lg:text-[10px] opacity-75">
                      {count ? `${count} free` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="font-medium text-[11px] text-ink2">Overlap</div>
            <div className="flex gap-1 items-center">
              {heatClass.map((cls) => (
                <span key={cls} className={`w-[18px] h-2.5 rounded ${cls}`} />
              ))}
            </div>
            <div className="font-medium text-[11px] text-ink2">0 → {total} free</div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {best && (
            <div className="bg-surface border-[1.5px] border-accent rounded-[18px] px-[15px] py-3.5 lg:p-5">
              <div className="flex justify-between items-center mb-2 gap-2">
                <h3 className="font-display font-semibold text-[15px]">
                  {locked ? "Locked" : "Best range"} ·{" "}
                  {rangeLabel(best.days[0], best.days[best.days.length - 1])}
                </h3>
                <div className="bg-accent-soft text-accent rounded-full px-[9px] py-1 font-semibold text-[10px] shrink-0">
                  {best.free} of {total} free
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2.5">
                <AvatarStack members={members.filter((m) => m.votedOnDates)} size={24} />
                <div className="text-[12px] text-ink2">
                  {notVoted.length
                    ? `${notVoted.map((m) => m.name.split(" ")[0]).join(", ")} ${
                        notVoted.length === 1 ? "hasn't" : "haven't"
                      } voted`
                    : "Everyone has voted"}
                </div>
              </div>
              <p className="text-[12px] leading-[1.45] text-ink2">
                {locked
                  ? "These dates are locked in."
                  : `Locks automatically when voting closes unless ${organiserName} picks another range.`}
              </p>
            </div>
          )}

          {error && (
            <p className="bg-warn-soft text-ink rounded-[14px] px-3.5 py-3 text-[12px]">{error}</p>
          )}

          {!locked && (
            <div className="flex gap-[9px]">
              <button
                type="button"
                onClick={() => save(myDays)}
                disabled={pending}
                className="flex-1 bg-accent text-accent-ink rounded-[15px] py-3.5 text-center font-semibold text-[15px] cursor-pointer hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Saving…" : submitted ? "Days submitted ✓" : "Submit my days"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMyDays(days);
                  save(days);
                }}
                disabled={pending}
                className="border border-line rounded-[15px] px-4 py-3.5 font-semibold text-[14px] text-ink2 cursor-pointer hover:border-accent hover:text-ink disabled:opacity-60"
              >
                Any day
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
