import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ---------------------------------------------------------------- trips */

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  /**
   * The secret in /join/<code>, separate from the slug so a trip URL seen in a
   * screenshot doesn't let people join, and so the organiser can reset it. The app
   * generates its own; the DB default only backfills existing trips.
   */
  inviteCode: text("invite_code")
    .notNull()
    .unique()
    .default(sql`substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)`),
  name: text("name").notNull(),
  /** Free text while the dates are still fuzzy, e.g. "Sometime in December". */
  timeframeLabel: text("timeframe_label").notNull().default(""),
  nightsLabel: text("nights_label").notNull().default(""),
  timeframeKind: text("timeframe_kind").notNull().default("weekend"),
  phase: text("phase").notNull().default("voting"),
  /** Month the date vote is held over; stored as its first day. */
  votingMonth: date("voting_month").notNull(),
  votingDeadline: timestamp("voting_deadline", { withTimezone: true }).notNull(),
  /** Set once the dates lock. */
  lockedStart: date("locked_start"),
  lockedEnd: date("locked_end"),
  /** Null means "no photo chosen" — the trip gets a generated banner instead. */
  coverKey: text("cover_key"),
  /** No longer used (reminders are per member now). Dropped once the new code is deployed. */
  automationsEnabled: boolean("automations_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------- identity */

/** One row per browser. Joining a trip needs no account, just this token. */
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    tone: text("tone").notNull().default("neutral"),
    isOrganiser: boolean("is_organiser").notNull().default(false),
    /** Optional — added later if they want reminders and the calendar invite. */
    email: text("email"),
    /** Their own on/off for reminder emails on this trip; the address stays saved when off. */
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("members_trip_idx").on(table.tripId)],
);

/** Which browsers act as which member. A member can be signed in on several devices. */
export const memberSessions = pgTable(
  "member_sessions",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sessionToken: text("session_token")
      .notNull()
      .references(() => sessions.token, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.sessionToken] }),
    index("member_sessions_token_idx").on(table.sessionToken),
  ],
);

/**
 * Single-use, short-lived links that sign another device in as a member.
 * Only a SHA-256 of the token is stored, so a database leak can't be replayed.
 */
export const deviceLinks = pgTable(
  "device_links",
  {
    tokenHash: text("token_hash").primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    /** "device" (QR / copy link, one live at a time) or "email" (one per email sent). */
    purpose: text("purpose").notNull().default("device"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("device_links_member_idx").on(table.memberId)],
);

/* ---------------------------------------------------------- date voting */

export const dateVotes = pgTable(
  "date_votes",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.day] }),
    index("date_votes_trip_idx").on(table.tripId),
  ],
);

/** Marks a member as having submitted, even if they picked no days. */
export const dateVoteSubmissions = pgTable(
  "date_vote_submissions",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.memberId] }), index("dvs_trip_idx").on(table.tripId)],
);

/* --------------------------------------------------- destination voting */

export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    costPerPerson: integer("cost_per_person").notNull().default(0),
    travel: text("travel").notNull().default(""),
    note: text("note").notNull().default(""),
    suggestedBy: uuid("suggested_by").references(() => members.id, {
      onDelete: "set null",
    }),
    /** Key into the bundled photo set; null falls back to a striped placeholder. */
    photoKey: text("photo_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("destinations_trip_idx").on(table.tripId)],
);

export const destinationVotes = pgTable(
  "destination_votes",
  {
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.destinationId, table.memberId] }),
    index("destination_votes_trip_idx").on(table.tripId),
  ],
);

/* ------------------------------------------------------------ itinerary */

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    startTime: time("start_time").notNull(),
    title: text("title").notNull(),
    place: text("place").notNull().default(""),
    addedBy: uuid("added_by").references(() => members.id, { onDelete: "set null" }),
    meta: text("meta"),
    highlight: boolean("highlight").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activities_trip_day_idx").on(table.tripId, table.day)],
);

/* ------------------------------------------------------------- expenses */

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Minor units, so no floating point ever touches money. */
    amountCents: integer("amount_cents").notNull(),
    paidBy: uuid("paid_by")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("expenses_trip_idx").on(table.tripId)],
);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    shareCents: integer("share_cents").notNull(),
  },
  (table) => [primaryKey({ columns: [table.expenseId, table.memberId] })],
);

/** Transfers people actually made. Suggested transfers are computed, not stored. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    fromMemberId: uuid("from_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    toMemberId: uuid("to_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payments_trip_idx").on(table.tripId)],
);

/* -------------------------------------------------------- updates feed */

export const updates = pgTable(
  "updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    icon: text("icon").notNull().default("•"),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    /** True when Lakad generated it rather than a person doing something. */
    automated: boolean("automated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("updates_trip_idx").on(table.tripId, table.createdAt)],
);

export const updateReads = pgTable(
  "update_reads",
  {
    updateId: uuid("update_id")
      .notNull()
      .references(() => updates.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.updateId, table.memberId] })],
);

/* ---------------------------------------------------------- automations */

/**
 * Work queued for an external automation runner (n8n). Lakad only ever
 * writes rows here; the runner polls for due work and marks it done:
 *
 *   SELECT * FROM outbox
 *    WHERE status = 'pending' AND run_after <= now()
 *    ORDER BY run_after LIMIT 20;
 *
 * Nothing in the app sends email or calendar invites itself.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull().default({}),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** Stops the same reminder being queued twice. */
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("outbox_due_idx").on(table.status, table.runAfter),
    uniqueIndex("outbox_dedupe_idx").on(table.dedupeKey),
  ],
);

export type Trip = typeof trips.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Destination = typeof destinations.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Update = typeof updates.$inferSelect;
export type OutboxRow = typeof outbox.$inferSelect;
