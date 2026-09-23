import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  activities,
  dateVoteSubmissions,
  dateVotes,
  destinationVotes,
  destinations,
  expenseSplits,
  expenses,
  members,
  payments,
  trips,
  updateReads,
  updates,
} from "@/db/schema";
import {
  RANGE_LENGTH,
  availabilityCounts,
  bestWindow,
  syncTrip,
  votingDays,
} from "@/lib/automations";
import { computeBalances, naivePaymentCount, settleUp } from "@/lib/balances";
import { getCurrentMember } from "@/lib/session";

export type MemberView = {
  id: string;
  name: string;
  initials: string;
  tone: "accent" | "ok" | "warn" | "neutral";
  isOrganiser: boolean;
  noAccount: boolean;
  votedOnDates: boolean;
};

export type TripContext = {
  trip: typeof trips.$inferSelect;
  members: MemberView[];
  currentMember: MemberView | null;
};

export const getTripBySlug = cache(async (slug: string) => {
  const [trip] = await db.select().from(trips).where(eq(trips.slug, slug)).limit(1);
  return trip ?? null;
});

export async function getMembers(tripId: string): Promise<MemberView[]> {
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      initials: members.initials,
      tone: members.tone,
      isOrganiser: members.isOrganiser,
      email: members.email,
      submittedAt: dateVoteSubmissions.submittedAt,
    })
    .from(members)
    .leftJoin(dateVoteSubmissions, eq(dateVoteSubmissions.memberId, members.id))
    .where(eq(members.tripId, tripId))
    .orderBy(desc(members.isOrganiser), asc(members.joinedAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials,
    tone: row.tone as MemberView["tone"],
    isOrganiser: row.isOrganiser,
    noAccount: !row.email,
    votedOnDates: Boolean(row.submittedAt),
  }));
}

/**
 * Loads the trip, moves it forward if a deadline has passed, and identifies you.
 *
 * Wrapped in `cache` so the layout, the page and generateMetadata share one
 * result per request instead of each paying the round trips again.
 */
export const getTripContext = cache(
  async (slug: string): Promise<TripContext | null> => {
    const found = await getTripBySlug(slug);
    if (!found) return null;

    const trip = await syncTrip(found);
    const [roster, me] = await Promise.all([
      getMembers(trip.id),
      getCurrentMember(trip.id),
    ]);

    return {
      trip,
      members: roster,
      currentMember: me ? (roster.find((m) => m.id === me.id) ?? null) : null,
    };
  },
);

/* ------------------------------------------------------------ date vote */

export async function getDateVoting(trip: typeof trips.$inferSelect, memberId?: string) {
  const [counts, mine, [submitted]] = await Promise.all([
    availabilityCounts(trip.id),
    memberId
      ? db
          .select({ day: dateVotes.day })
          .from(dateVotes)
          .where(and(eq(dateVotes.tripId, trip.id), eq(dateVotes.memberId, memberId)))
      : [],
    memberId
      ? db
          .select({ at: dateVoteSubmissions.submittedAt })
          .from(dateVoteSubmissions)
          .where(eq(dateVoteSubmissions.memberId, memberId))
      : [],
  ]);

  const days = votingDays(trip.votingMonth);
  const best = bestWindow(counts, days, RANGE_LENGTH);

  return {
    counts: Object.fromEntries(counts),
    myDays: mine.map((row) => row.day),
    submitted: Boolean(submitted),
    best,
  };
}

/* ---------------------------------------------------------- destinations */

export type DestinationView = {
  id: string;
  name: string;
  costPerPerson: number;
  travel: string;
  note: string;
  photoKey: string | null;
  suggestedByName: string | null;
  voterIds: string[];
};

export async function getDestinations(tripId: string): Promise<DestinationView[]> {
  const [rows, votes] = await Promise.all([
    db
      .select({
        id: destinations.id,
        name: destinations.name,
        costPerPerson: destinations.costPerPerson,
        travel: destinations.travel,
        note: destinations.note,
        photoKey: destinations.photoKey,
        suggestedByName: members.name,
      })
      .from(destinations)
      .leftJoin(members, eq(members.id, destinations.suggestedBy))
      .where(eq(destinations.tripId, tripId))
      .orderBy(asc(destinations.createdAt)),
    db
      .select({ destinationId: destinationVotes.destinationId, memberId: destinationVotes.memberId })
      .from(destinationVotes)
      .innerJoin(destinations, eq(destinations.id, destinationVotes.destinationId))
      .where(eq(destinations.tripId, tripId)),
  ]);

  const byDestination = new Map<string, string[]>();
  for (const vote of votes) {
    const list = byDestination.get(vote.destinationId) ?? [];
    list.push(vote.memberId);
    byDestination.set(vote.destinationId, list);
  }

  return rows.map((row) => ({ ...row, voterIds: byDestination.get(row.id) ?? [] }));
}

/* ------------------------------------------------------------ itinerary */

export type ActivityView = {
  id: string;
  day: string;
  startTime: string;
  title: string;
  place: string;
  meta: string | null;
  highlight: boolean;
  addedById: string | null;
  addedByName: string | null;
};

export async function getActivities(tripId: string): Promise<ActivityView[]> {
  const rows = await db
    .select({
      id: activities.id,
      day: activities.day,
      startTime: activities.startTime,
      title: activities.title,
      place: activities.place,
      meta: activities.meta,
      highlight: activities.highlight,
      addedById: activities.addedBy,
      addedByName: members.name,
    })
    .from(activities)
    .leftJoin(members, eq(members.id, activities.addedBy))
    .where(eq(activities.tripId, tripId))
    .orderBy(asc(activities.day), asc(activities.startTime));
  return rows;
}

/* ------------------------------------------------------------- expenses */

export async function getExpenseData(tripId: string, memberIds: string[]) {
  const [expenseRows, splitRows, paymentRows] = await Promise.all([
    db
      .select({
        id: expenses.id,
        title: expenses.title,
        amountCents: expenses.amountCents,
        paidBy: expenses.paidBy,
        paidByName: members.name,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .leftJoin(members, eq(members.id, expenses.paidBy))
      .where(eq(expenses.tripId, tripId))
      .orderBy(desc(expenses.createdAt)),
    db
      .select({
        expenseId: expenseSplits.expenseId,
        memberId: expenseSplits.memberId,
        shareCents: expenseSplits.shareCents,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(eq(expenses.tripId, tripId)),
    db
      .select({
        id: payments.id,
        fromMemberId: payments.fromMemberId,
        toMemberId: payments.toMemberId,
        amountCents: payments.amountCents,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(eq(payments.tripId, tripId))
      .orderBy(desc(payments.paidAt)),
  ]);

  const balances = computeBalances({
    expenses: expenseRows.map((e) => ({ id: e.id, paidBy: e.paidBy, amountCents: e.amountCents })),
    splits: splitRows,
    payments: paymentRows,
    memberIds,
  });

  const splitCount = new Map<string, number>();
  for (const split of splitRows) {
    splitCount.set(split.expenseId, (splitCount.get(split.expenseId) ?? 0) + 1);
  }

  return {
    expenses: expenseRows.map((e) => ({
      ...e,
      splitCount: splitCount.get(e.id) ?? 0,
      perPersonCents: Math.round(e.amountCents / Math.max(splitCount.get(e.id) ?? 1, 1)),
    })),
    payments: paymentRows,
    balances,
    transfers: settleUp(balances),
    totalCents: expenseRows.reduce((sum, e) => sum + e.amountCents, 0),
    naiveCount: naivePaymentCount(
      expenseRows.map((e) => ({ id: e.id, paidBy: e.paidBy })),
      splitRows,
    ),
  };
}

/* -------------------------------------------------------------- updates */

export type UpdateView = {
  id: string;
  kind: string;
  title: string;
  body: string;
  icon: string;
  memberId: string | null;
  automated: boolean;
  unread: boolean;
  group: "Today" | "Earlier";
  timeAgo: string;
};

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

function relativeTime(date: Date, now: number) {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export async function getUpdates(tripId: string, memberId?: string): Promise<UpdateView[]> {
  const rows = await db
    .select({
      id: updates.id,
      kind: updates.kind,
      title: updates.title,
      body: updates.body,
      icon: updates.icon,
      memberId: updates.memberId,
      automated: updates.automated,
      createdAt: updates.createdAt,
      readAt: updateReads.readAt,
    })
    .from(updates)
    .leftJoin(
      updateReads,
      memberId
        ? and(eq(updateReads.updateId, updates.id), eq(updateReads.memberId, memberId))
        : sql`false`,
    )
    .where(eq(updates.tripId, tripId))
    .orderBy(desc(updates.createdAt))
    .limit(30);

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  return rows.map(({ readAt, createdAt, ...row }) => ({
    ...row,
    unread: memberId ? !readAt : false,
    group: createdAt.getTime() >= dayAgo ? ("Today" as const) : ("Earlier" as const),
    timeAgo: relativeTime(createdAt, now),
  }));
}

export async function countUnread(tripId: string, memberId?: string) {
  if (!memberId) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(updates)
    .leftJoin(
      updateReads,
      and(eq(updateReads.updateId, updates.id), eq(updateReads.memberId, memberId)),
    )
    .where(and(eq(updates.tripId, tripId), isNull(updateReads.readAt)));
  return row?.count ?? 0;
}
