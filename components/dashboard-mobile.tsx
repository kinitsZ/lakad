import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { CopyLinkButton } from "@/components/trip-nav";
import { TripBanner } from "@/components/trip-banner";
import { AvatarStack, PhasePill, StatusBanner } from "@/components/ui";
import type { DashboardSummary } from "@/db/dashboard";
import type { MemberView } from "@/db/queries";
import type { Trip } from "@/db/schema";
import { money } from "@/lib/money";

const heatClass = ["bg-h0", "bg-h1", "bg-h2", "bg-h3"];
const PHASES = ["Voting", "Planning", "Ongoing", "Done"];
const phaseLabel = (phase: string) => phase[0].toUpperCase() + phase.slice(1);

export function DashboardMobile({
  slug,
  trip,
  members,
  summary,
  inviteUrl,
}: {
  slug: string;
  trip: Trip;
  members: MemberView[];
  summary: DashboardSummary;
  inviteUrl: string;
}) {
  const current = phaseLabel(trip.phase);

  return (
    <div className="lg:hidden w-full">
      <TripBanner
        name={trip.name}
        seed={trip.name}
        coverKey={trip.coverKey}
        showName={false}
        className="h-[150px]"
        columnClassName="max-w-[430px]"
        sizes="100vw"
        priority
      >
        <div className="mx-auto w-full max-w-[430px] h-full px-[18px] py-3.5 flex justify-end items-start">
          <div className="flex gap-2">
            <ThemeToggle variant="icon" />
            <Link
              href={`/trip/${slug}/updates`}
              aria-label={`${summary.unreadCount} unread updates`}
              className="relative w-8 h-8 rounded-full bg-surface border border-line grid place-items-center font-semibold text-[12px] text-ink hover:border-accent"
            >
              {summary.unreadCount}
              {summary.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-[9px] h-[9px] rounded-full bg-accent border-2 border-bg" />
              )}
            </Link>
          </div>
        </div>
      </TripBanner>

      <div className="mx-auto w-full max-w-[430px] px-5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <PhasePill phase={current} />
          <div className="text-[11px] text-ink2">
            {PHASES.filter((p) => p !== current).join(" · ")}
          </div>
        </div>

        <h1 className="font-display font-semibold text-[29px] leading-[1.08] tracking-[-0.025em] mb-3">
          {trip.name}
        </h1>

        <div className="flex items-center justify-between mb-3.5">
          <AvatarStack members={members} size={30} ring="bg" max={5} />
          <CopyLinkButton
            url={inviteUrl}
            className="font-semibold text-[12px] text-accent"
            label="Invite"
            copiedLabel="Link copied"
          />
        </div>

        {trip.phase === "voting" && (
          <StatusBanner
            className="mb-3"
            title={`Voting closes in ${summary.closesIn}`}
            detail={
              summary.pendingCount
                ? `${summary.votedCount} of ${summary.memberCount} have voted · ${summary.pendingNames} pending`
                : `Everyone has voted`
            }
            trailing={
              <div className="font-display font-semibold text-[22px]">
                {summary.countdownShort}
              </div>
            }
          />
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <SummaryCard
            href={`/trip/${slug}/dates`}
            label="Dates"
            value={summary.hasDateVotes ? summary.dateRange : "Open"}
          >
            <div className="flex gap-[3px] mb-1.5">
              {summary.bestRangeLevels.map((level, i) => (
                <span key={i} className={`h-[5px] flex-1 rounded-[3px] ${heatClass[level]}`} />
              ))}
            </div>
            <div className="text-[11px] text-ink2">
              {summary.hasDateVotes
                ? `${trip.lockedStart ? "Locked" : "Leading"} · ${summary.rangeFree} free`
                : "No votes yet"}
            </div>
          </SummaryCard>

          <SummaryCard
            href={`/trip/${slug}/destinations`}
            label="Destination"
            value={summary.leadingDestination?.name.split(" ")[0] ?? "—"}
          >
            <div className="text-[12px] text-ink2 mb-1">
              {summary.leadingDestination
                ? `${summary.leadingDestination.voterIds.length} votes${
                    summary.runnerUp
                      ? ` · ${summary.runnerUp.name.split(" ")[0]} ${summary.runnerUp.voterIds.length}`
                      : ""
                  }`
                : "Nothing suggested yet"}
            </div>
            <div className="text-[11px] text-accent">{summary.raceLabel}</div>
          </SummaryCard>

          <SummaryCard
            href={`/trip/${slug}/itinerary`}
            label="Itinerary"
            value={`${summary.activityCount} ${
              summary.activityCount === 1 ? "activity" : "activities"
            }`}
          >
            <div className="text-[12px] text-ink2">{summary.emptyDayLabel}</div>
          </SummaryCard>

          <SummaryCard
            href={`/trip/${slug}/expenses`}
            label="Expenses"
            value={money(summary.totalCents)}
          >
            <div className={`text-[12px] ${summary.unpaidCount ? "text-warn" : "text-ink2"}`}>
              {summary.unpaidCount
                ? `${summary.unpaidCount} ${
                    summary.unpaidCount === 1 ? "person hasn't" : "people haven't"
                  } paid`
                : summary.hasExpenses
                  ? "All settled up"
                  : "Nothing spent yet"}
            </div>
          </SummaryCard>
        </div>

        <div className="flex justify-between items-center bg-surface border border-line rounded-[16px] px-[15px] py-[13px] mt-3 gap-3">
          <div className="font-medium text-[13px] text-ink2 truncate">
            {inviteUrl.replace(/^https?:\/\//, "")}
          </div>
          <CopyLinkButton
            url={inviteUrl}
            className="font-semibold text-[12px] text-accent shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  href,
  label,
  value,
  children,
}: {
  href: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-surface border border-line rounded-[18px] p-3.5 hover:border-accent"
    >
      <div className="font-semibold text-[11px] uppercase text-ink2 mb-1.5">{label}</div>
      <div className="font-display font-semibold text-[17px] mb-1.5">{value}</div>
      {children}
    </Link>
  );
}
