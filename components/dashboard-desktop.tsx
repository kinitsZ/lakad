import Link from "next/link";
import { EmailNudge } from "@/components/email-card";
import { LockDatesButton } from "@/components/lock-dates-button";
import { TripBanner } from "@/components/trip-banner";
import { Avatar, AvatarStack, PhasePill } from "@/components/ui";
import type { DashboardSummary } from "@/db/dashboard";
import type { MemberView } from "@/db/queries";
import type { Trip } from "@/db/schema";
import { timeLabel } from "@/lib/format";
import { moneyExact } from "@/lib/money";

const heatClass = ["bg-h0", "bg-h1", "bg-h2", "bg-h3"];
const barClass = ["bg-accent", "bg-h2", "bg-h1"];
const PHASES = ["Voting", "Planning", "Ongoing", "Done"];
const phaseLabel = (phase: string) => phase[0].toUpperCase() + phase.slice(1);

export function DashboardDesktop({
  slug,
  trip,
  members,
  summary,
  isOrganiser,
  needsEmail,
}: {
  slug: string;
  trip: Trip;
  members: MemberView[];
  summary: DashboardSummary;
  isOrganiser: boolean;
  needsEmail: boolean;
}) {
  const current = phaseLabel(trip.phase);

  return (
    <div className="hidden lg:block">
      <TripBanner
        name={trip.name}
        seed={trip.name}
        coverKey={trip.coverKey}
        showName={false}
        className="h-[210px]"
        sizes="100vw"
        priority
      >
        <div className="max-w-[1280px] mx-auto h-full px-6 py-4 flex justify-end items-start">
          <button
            type="button"
            className="bg-surface border border-line rounded-full px-[13px] py-[7px] font-semibold text-[12px] text-ink2 cursor-pointer hover:border-accent hover:text-ink"
          >
            Change cover
          </button>
        </div>
      </TripBanner>

      <div className="p-6 grid grid-cols-[minmax(0,1fr)_340px] gap-6 items-start max-w-[1280px] mx-auto">
        <div className="flex flex-col gap-[18px]">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <PhasePill phase={current} />
              <div className="flex items-center gap-2 font-medium text-[12px] text-ink2">
                {PHASES.map((phase, i) => (
                  <span key={phase} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden>›</span>}
                    <span className={phase === current ? "text-ink" : undefined}>{phase}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-between gap-5 flex-wrap">
              <div>
                <h1 className="font-display font-semibold text-[38px] leading-[1.05] tracking-[-0.03em] mb-2">
                  {trip.name}
                </h1>
                <p className="text-[14px] text-ink2">
                  {[trip.timeframeLabel, trip.nightsLabel, summary.memberLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <AvatarStack members={members} size={34} ring="bg" />
              </div>
            </div>
          </div>

          {trip.phase === "voting" && (
            <div className="bg-ink text-bg rounded-[20px] px-[22px] py-[18px] flex items-center justify-between gap-6">
              <div>
                <div className="font-semibold text-[16px] mb-1">
                  Voting closes in {summary.closesIn}
                </div>
                <div className="text-[13px] opacity-[0.72]">
                  {summary.votedCount} of {summary.memberCount} voted
                  {summary.pendingCount
                    ? ` · ${summary.pendingNames} ${summary.pendingVerb} a nudge 24 hours before, then dates lock automatically`
                    : " · dates lock when the deadline passes"}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="font-display font-semibold text-[30px]">
                  {summary.countdownLong}
                </div>
                {isOrganiser && <LockDatesButton tripId={trip.id} />}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5 stagger-children">
            <DesktopCard
              label="Dates"
              action={{ label: "Vote", href: `/trip/${slug}/dates` }}
              value={summary.hasDateVotes ? summary.dateRange : "Open"}
            >
              <div className="grid grid-cols-7 gap-[5px] mb-2.5">
                {summary.weekStrip.map((level, i) => (
                  <span key={i} className={`h-[26px] rounded-[7px] ${heatClass[level]}`} />
                ))}
              </div>
              <p className="text-[13px] text-ink2">
                {!summary.hasDateVotes
                  ? "No votes yet — mark the days that work for you"
                  : `${trip.lockedStart ? "Locked range" : "Leading range"} · ${
                      summary.rangeFree
                    } of ${summary.memberCount} free${
                      summary.pendingCount ? ` · ${summary.pendingNames} still to vote` : ""
                    }`}
              </p>
            </DesktopCard>

            <DesktopCard
              label="Destination"
              action={{ label: "Vote", href: `/trip/${slug}/destinations` }}
              value={summary.leadingDestination?.name ?? "Nothing suggested"}
            >
              <div className="flex flex-col gap-[7px] mb-2.5">
                {summary.destinationBars.map((bar, i) => (
                  <div key={bar.id} className="flex items-center gap-[9px]">
                    <div className="font-medium text-[12px] w-[52px] truncate">{bar.name}</div>
                    <div className="flex-1 h-2 rounded-[5px] bg-surface2 overflow-hidden">
                      <div
                        className={`h-full ${barClass[i] ?? "bg-h1"} origin-left animate-grow transition-[width] duration-500`}
                        style={{ width: `${bar.percent}%` }}
                      />
                    </div>
                    <div className="font-semibold text-[12px]">{bar.votes}</div>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-ink2">{summary.raceLabel}</p>
            </DesktopCard>

            <DesktopCard
              label="Itinerary"
              action={{ label: "Open", href: `/trip/${slug}/itinerary` }}
              value={`${summary.activityCount} ${
                summary.activityCount === 1 ? "activity" : "activities"
              }`}
            >
              <div className="flex flex-col gap-2">
                {summary.dayPreview.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2.5">
                    <div className="font-semibold text-[11px] text-ink2 w-[46px]">
                      {timeLabel(activity.startTime)}
                    </div>
                    <div className="font-medium text-[13px] flex-1 truncate">
                      {activity.title}
                    </div>
                    <Avatar
                      member={members.find((m) => m.id === activity.addedById)}
                      size={22}
                    />
                  </div>
                ))}
                <p className="text-[13px] text-warn">{summary.emptyDayWeekday}</p>
              </div>
            </DesktopCard>

            <DesktopCard
              label="Expenses"
              action={{ label: "Settle up", href: `/trip/${slug}/expenses/settle` }}
              value={moneyExact(summary.totalCents)}
              tightValue
            >
              <p
                className={`text-[13px] mb-3 ${
                  summary.myBalanceCents === 0
                    ? "text-ink2"
                    : summary.myBalanceCents > 0
                      ? "text-ok"
                      : "text-warn"
                }`}
              >
                {summary.myBalanceCents === 0
                  ? "You don't owe anything"
                  : `${summary.myBalanceCents > 0 ? "You get back" : "You owe"} ${moneyExact(
                      summary.myBalanceCents,
                    )}`}
              </p>
              {summary.unpaidCount > 0 && (
                <div className="flex items-center gap-2 bg-warn-soft rounded-xl px-3 py-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                  <div className="font-medium text-[12px] text-ink">
                    {summary.unpaidCount}{" "}
                    {summary.unpaidCount === 1 ? "person still owes" : "people still owe"} money
                  </div>
                </div>
              )}
            </DesktopCard>
          </div>
        </div>

        <aside className="flex flex-col gap-3.5 stagger-children">
          {needsEmail && <EmailNudge slug={slug} />}
          <div className="bg-surface border border-line rounded-[20px] p-[18px]">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display font-semibold text-[15px]">Updates</h2>
              <Link
                href={`/trip/${slug}/updates`}
                className="font-semibold text-[12px] text-accent"
              >
                All
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {summary.updates.slice(0, 3).map((update) => (
                <div key={update.id} className="flex gap-[11px]">
                  {update.memberId ? (
                    <Avatar
                      member={members.find((m) => m.id === update.memberId)}
                      size={28}
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 shrink-0 rounded-[10px] grid place-items-center font-bold text-[12px] ${
                        update.automated ? "bg-accent text-accent-ink" : "bg-surface2 text-ink2"
                      }`}
                    >
                      {update.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] mb-0.5">{update.title}</div>
                    <div className="text-[12px] text-ink2 truncate">{update.body}</div>
                  </div>
                </div>
              ))}
              {!summary.updates.length && (
                <p className="text-[13px] text-ink2">Nothing has happened yet.</p>
              )}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-[20px] p-[18px]">
            <h2 className="font-display font-semibold text-[15px] mb-3.5">Who&rsquo;s voted</h2>
            <div className="flex flex-col gap-2.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <Avatar member={m} size={28} />
                  <div className="flex-1 font-medium text-[13px] truncate">
                    {m.name.split(" ")[0]}
                    {m.isOrganiser && (
                      <span className="text-ink2 font-normal"> · organiser</span>
                    )}
                    {m.noAccount && <span className="text-ink2 font-normal"> · no email</span>}
                  </div>
                  <div
                    className={`font-semibold text-[11px] ${
                      m.votedOnDates ? "text-ok" : "text-ink2"
                    }`}
                  >
                    {m.votedOnDates ? "Voted" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DesktopCard({
  label,
  action,
  value,
  tightValue,
  children,
}: {
  label: string;
  action: { label: string; href: string };
  value: string;
  tightValue?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-line rounded-[20px] p-[18px] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,.08)]">
      <div className="flex justify-between mb-2.5">
        <div className="font-semibold text-[12px] text-ink2 tracking-[0.08em] uppercase">
          {label}
        </div>
        <Link href={action.href} className="font-semibold text-[12px] text-accent">
          {action.label}
        </Link>
      </div>
      <div
        className={`font-display font-semibold text-[24px] ${tightValue ? "mb-1.5" : "mb-3"}`}
      >
        {value}
      </div>
      {children}
    </div>
  );
}
