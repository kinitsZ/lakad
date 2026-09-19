/**
 * Rebuilds the "Cabo Reunion" demo trip from scratch.
 *   npm run db:seed
 *
 * The numbers here are the ones the design used, adjusted where the mock
 * didn't add up — balances are now real arithmetic over the expense list.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activities,
  dateVoteSubmissions,
  dateVotes,
  destinationVotes,
  destinations,
  expenseSplits,
  expenses,
  members,
  outbox,
  payments,
  sessions,
  trips,
  updates,
} from "./schema";

const SLUG = "cabo-reunion";
const VOTING_MONTH = "2026-12-01";

const day = (n: number) => `2026-12-${String(n).padStart(2, "0")}`;

/** How many of the five voters are free, per day of December. */
const AVAILABILITY: Record<number, number> = {
  1: 1, 2: 0, 3: 2, 4: 3, 5: 3, 6: 1,
  7: 0, 8: 1, 9: 2, 10: 2, 11: 4, 12: 5, 13: 5,
  14: 5, 15: 5, 16: 1, 17: 1, 18: 3, 19: 4, 20: 2,
  21: 0, 22: 0, 23: 0, 24: 0, 25: 0, 26: 1, 27: 1,
  28: 0, 29: 0, 30: 1, 31: 0,
};

const PEOPLE = [
  { key: "maya", name: "Maya Rivera", initials: "MR", tone: "accent", organiser: true, email: "maya@example.com" },
  { key: "theo", name: "Theo Adeyemi", initials: "TA", tone: "ok", email: "theo@example.com" },
  { key: "priya", name: "Priya Desai", initials: "PD", tone: "warn", email: "priya@example.com" },
  { key: "jonah", name: "Jonah Lindqvist", initials: "JL", tone: "neutral", email: "jonah@example.com" },
  { key: "ruth", name: "Ruth Kimani", initials: "RK", tone: "neutral", email: null },
  { key: "sam", name: "Sam Moreau", initials: "SM", tone: "neutral", email: "sam@example.com" },
] as const;

/** Everyone but Ruth has voted on dates. */
const VOTERS = ["maya", "theo", "priya", "jonah", "sam"] as const;

async function main() {
  const [existing] = await db.select().from(trips).where(eq(trips.slug, SLUG)).limit(1);
  if (existing) {
    await db.delete(trips).where(eq(trips.id, existing.id));
    console.log("· removed the previous demo trip");
  }

  const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const [trip] = await db
    .insert(trips)
    .values({
      slug: SLUG,
      name: "Cabo Reunion",
      timeframeLabel: "Sometime in December",
      nightsLabel: "3–4 nights",
      timeframeKind: "weekend",
      phase: "voting",
      votingMonth: VOTING_MONTH,
      votingDeadline: deadline,
      coverKey: "caboCover",
    })
    .returning();

  const ids: Record<string, string> = {};
  for (const person of PEOPLE) {
    const [row] = await db
      .insert(members)
      .values({
        tripId: trip.id,
        name: person.name,
        initials: person.initials,
        tone: person.tone,
        isOrganiser: "organiser" in person ? Boolean(person.organiser) : false,
        email: person.email,
      })
      .returning({ id: members.id });
    ids[person.key] = row.id;
  }

  // Date votes: for a day with N free, the first N voters are available.
  const voteRows: { tripId: string; memberId: string; day: string }[] = [];
  for (const [dayNumber, count] of Object.entries(AVAILABILITY)) {
    for (const key of VOTERS.slice(0, count)) {
      voteRows.push({ tripId: trip.id, memberId: ids[key], day: day(Number(dayNumber)) });
    }
  }
  if (voteRows.length) await db.insert(dateVotes).values(voteRows);
  await db
    .insert(dateVoteSubmissions)
    .values(VOTERS.map((key) => ({ tripId: trip.id, memberId: ids[key] })));

  const places = [
    {
      name: "Cabo San Lucas", costPerPerson: 540, travel: "4h flight", photoKey: "caboArch",
      note: "Villa sleeps 7, short hop for the west coast crew.",
      by: "maya", votes: ["maya", "theo", "priya", "ruth"],
    },
    {
      name: "Tulum", costPerPerson: 620, travel: "6h", photoKey: "tulum",
      note: "Cenotes, and Priya has a friend with a place.",
      by: "theo", votes: ["theo", "priya", "jonah"],
    },
    {
      name: "Lisbon", costPerPerson: 890, travel: "11h", photoKey: "lisbon",
      note: "Long flight, but cheap food and wine.",
      by: "jonah", votes: ["jonah"],
    },
  ];

  for (const place of places) {
    const [row] = await db
      .insert(destinations)
      .values({
        tripId: trip.id, name: place.name, costPerPerson: place.costPerPerson,
        travel: place.travel, note: place.note, photoKey: place.photoKey,
        suggestedBy: ids[place.by],
      })
      .returning({ id: destinations.id });
    await db.insert(destinationVotes).values(
      place.votes.map((key) => ({
        tripId: trip.id, destinationId: row.id, memberId: ids[key],
      })),
    );
  }

  const plan = [
    { day: day(12), startTime: "14:10:00", title: "Land at SJD, pick up van", place: "Los Cabos International", by: "maya" },
    { day: day(12), startTime: "17:00:00", title: "Villa check-in & grocery run", place: "Pedregal · La Comer on the way", by: "priya" },
    { day: day(12), startTime: "20:30:00", title: "Tacos at Los Claros", place: "Table for 6 booked · $18 pp", by: "theo", meta: "5 going", highlight: true },
    { day: day(14), startTime: "09:30:00", title: "Snorkel at Chileno Bay", place: "Gear from the shack by the car park", by: "theo" },
    { day: day(14), startTime: "13:00:00", title: "Long lunch at Flora Farms", place: "San José del Cabo · booked for 6", by: "priya" },
    { day: day(14), startTime: "18:30:00", title: "Sunset sail past the Arch", place: "Marina dock 3 · $45 pp", by: "maya", meta: "6 going" },
    { day: day(15), startTime: "08:00:00", title: "Beach run and coffee", place: "Médano Beach", by: "jonah" },
    { day: day(15), startTime: "11:00:00", title: "Villa checkout, bags in the van", place: "Pedregal", by: "maya" },
    { day: day(15), startTime: "13:45:00", title: "Flights home from SJD", place: "Los Cabos International", by: "maya" },
  ];
  await db.insert(activities).values(
    plan.map((item) => ({
      tripId: trip.id, day: item.day, startTime: item.startTime, title: item.title,
      place: item.place, addedBy: ids[item.by], meta: item.meta ?? null,
      highlight: item.highlight ?? false,
    })),
  );

  const spend = [
    { title: "Villa deposit", amountCents: 120_000, by: "maya", split: ["maya", "theo", "priya", "jonah", "ruth", "sam"] },
    { title: "Groceries", amountCents: 26_400, by: "priya", split: ["maya", "theo", "priya", "jonah", "ruth", "sam"] },
    { title: "Van rental", amountCents: 37_600, by: "theo", split: ["maya", "theo", "priya", "jonah"] },
  ];
  for (const item of spend) {
    const [row] = await db
      .insert(expenses)
      .values({ tripId: trip.id, title: item.title, amountCents: item.amountCents, paidBy: ids[item.by] })
      .returning({ id: expenses.id });
    const share = Math.round(item.amountCents / item.split.length);
    await db.insert(expenseSplits).values(
      item.split.map((key) => ({ expenseId: row.id, memberId: ids[key], shareCents: share })),
    );
  }

  // One transfer already made, so the settle-up screen has a settled row.
  await db.insert(payments).values({
    tripId: trip.id, fromMemberId: ids.ruth, toMemberId: ids.maya, amountCents: 24_400,
    paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  await db.insert(updates).values([
    {
      tripId: trip.id, kind: "trip_created", icon: "✦",
      title: "Maya started Cabo Reunion", body: "Share the invite link so everyone can vote on dates.",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      tripId: trip.id, kind: "reminder_sent", icon: "24h", automated: true,
      title: "Reminder sent to 2 non-voters", body: "Automatic",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      tripId: trip.id, kind: "activity_added", icon: "TA", memberId: ids.theo,
      title: "Theo added “Snorkel at Chileno Bay”", body: "Day 3, 9:30 am",
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    },
    {
      tripId: trip.id, kind: "payment_recorded", icon: "$",
      title: "Ruth paid Maya", body: "$244.00 toward the villa deposit",
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    },
    {
      tripId: trip.id, kind: "member_joined", icon: "+", memberId: ids.ruth,
      title: "Ruth joined the trip", body: "Nudged to vote on dates.",
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  ]);

  await db.insert(outbox).values({
    tripId: trip.id,
    kind: "vote_reminder",
    payload: { slug: SLUG, tripName: trip.name },
    runAfter: new Date(deadline.getTime() - 24 * 60 * 60 * 1000),
    dedupeKey: `vote_reminder:${trip.id}`,
  });

  await db.delete(sessions).where(eq(sessions.token, "seed-demo"));

  console.log(`✓ seeded /trip/${SLUG} — ${PEOPLE.length} members, voting closes ${deadline.toISOString()}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
