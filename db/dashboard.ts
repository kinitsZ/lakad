import "server-only";
import {
  getActivities,
  getDateVoting,
  getDestinations,
  getExpenseData,
  getUpdates,
  type TripContext,
} from "@/db/queries";
import {
  countdownLabel,
  countdownLong,
  countdownShort,
  rangeLabel,
  weekday,
} from "@/lib/format";

const heatLevel = (count: number, total: number): 0 | 1 | 2 | 3 => {
  if (count <= 0) return 0;
  const share = count / Math.max(total, 1);
  if (share >= 0.8) return 3;
  if (share >= 0.5) return 2;
  return 1;
};

/** Everything the dashboard shows, derived from the trip's real rows. */
export async function getDashboard({ trip, members, currentMember }: TripContext) {
  const [voting, places, plan, money, updates] = await Promise.all([
    getDateVoting(trip, currentMember?.id),
    getDestinations(trip.id),
    getActivities(trip.id),
    getExpenseData(
      trip.id,
      members.map((m) => m.id),
    ),
    getUpdates(trip.id, currentMember?.id),
  ]);

  const total = members.length;
  const pending = members.filter((m) => !m.votedOnDates);
  const ranked = [...places].sort((a, b) => b.voterIds.length - a.voterIds.length);
  const [leading, runnerUp] = ranked;

  const range =
    trip.lockedStart && trip.lockedEnd
      ? { days: [trip.lockedStart, trip.lockedEnd], free: voting.best?.free ?? 0 }
      : voting.best;

  const rangeDays = trip.lockedStart && trip.lockedEnd ? voting.best?.days : voting.best?.days;

  // Days in the plan that nobody has filled in yet.
  const plannedDays = new Set(plan.map((a) => a.day));
  const tripDays = rangeDays ?? [];
  const emptyDay = tripDays.find((day) => !plannedDays.has(day));

  const firstPlannedDay = plan.length ? plan[0].day : null;
  const dayOne = plan.filter((a) => a.day === firstPlannedDay);
  const preview = dayOne.length > 1 ? [dayOne[0], dayOne[dayOne.length - 1]] : dayOne;

  const myBalance = money.balances.find((b) => b.memberId === currentMember?.id);
  const margin = (leading?.voterIds.length ?? 0) - (runnerUp?.voterIds.length ?? 0);
  const hasDateVotes = Object.values(voting.counts).some((n) => n > 0);
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  return {
    memberCount: total,
    votedCount: members.filter((m) => m.votedOnDates).length,
    pendingNames: pending.map((m) => m.name.split(" ")[0]).join(", "),
    pendingCount: pending.length,
    memberLabel: `${total} ${plural(total, "friend", "friends")}`,
    /** "Sam gets" vs "Sam and Ruth get" — reads wrong otherwise. */
    pendingVerb: plural(pending.length, "gets", "get"),

    /** "2 days" for prose, precise hours for the big number beside it. */
    closesIn: countdownLabel(trip.votingDeadline),
    countdownShort: countdownShort(trip.votingDeadline),
    countdownLong: countdownLong(trip.votingDeadline),

    dateRange: range ? rangeLabel(range.days[0], range.days[range.days.length - 1]) : "Not set",
    rangeFree: range?.free ?? 0,
    hasDateVotes,
    bestRangeLevels: (voting.best?.days ?? []).map((day) =>
      heatLevel(voting.counts[day] ?? 0, total),
    ),
    weekStrip: leadingWeek(voting.counts, voting.best?.days ?? [], total),

    leadingDestination: leading ?? null,
    runnerUp: runnerUp ?? null,
    raceLabel: !leading
      ? "Add somewhere to go"
      : !runnerUp
        ? "Only option so far"
        : margin <= 1
          ? "Tight race"
          : "Clear leader",
    destinationBars: ranked.map((place) => ({
      id: place.id,
      name: place.name.split(" ")[0],
      votes: place.voterIds.length,
      percent: Math.round((place.voterIds.length / Math.max(total, 1)) * 100),
    })),

    activityCount: plan.length,
    emptyDayLabel: !plan.length
      ? "Nothing planned yet"
      : emptyDay
        ? `Day ${tripDays.indexOf(emptyDay) + 1} still empty`
        : "Every day planned",
    emptyDayWeekday: !plan.length
      ? "Nothing planned yet"
      : emptyDay
        ? `${weekday(emptyDay)} still empty`
        : "Every day planned",
    dayPreview: preview,

    totalCents: money.totalCents,
    unpaidCount: money.balances.filter((b) => b.cents < 0).length,
    hasExpenses: money.totalCents > 0,
    myBalanceCents: myBalance?.cents ?? 0,

    updates,
    unreadCount: updates.filter((u) => u.unread).length,
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboard>>;

/** Seven days around the leading range, for the desktop heat strip. */
function leadingWeek(counts: Record<string, number>, best: string[], total: number) {
  if (!best.length) return [];
  const start = new Date(`${best[0]}T00:00:00Z`);
  const offset = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const iso = day.toISOString().slice(0, 10);
    return heatLevel(counts[iso] ?? 0, total);
  });
}
