# Lakad

A group trip planner: one person creates a trip and shares a link, friends join
without an account, then everyone votes on dates and destinations, builds the
itinerary together and splits the bill.

Built from a Claude Design handoff — Next.js 16 (App Router) + Postgres.

## Running it

```bash
npm install
cp .env.example .env.local     # point DATABASE_URL at your database
npm run db:migrate             # create the tables
npm run db:seed                # optional: the "Cabo Reunion" demo trip
npm run dev
```

Then open http://localhost:3000. The seed puts a fully populated trip at
`/trip/cabo-reunion` and prints its invite link (`/join/<code>`); open that as a
fresh browser to go through the join flow, which is the real path an invited
friend takes.

### Pointing at Supabase

1. Create a project, then **Project Settings → Database → Connection string → URI**.
2. On serverless hosts (Vercel), use the **transaction pooler** (port `6543`) for
   `DATABASE_URL`. Locally, the **session pooler** (port `5432`) is faster. The
   client turns prepared statements off automatically on 6543, which that pooler
   requires.
3. `npm run db:migrate` against it once.

The schema uses nothing Supabase-specific, so a plain Postgres 15+ works too.

## How it fits together

| Layer | Where |
|---|---|
| Schema | [`db/schema.ts`](db/schema.ts), migrations in [`drizzle/`](drizzle) |
| Reads | [`db/queries.ts`](db/queries.ts), [`db/dashboard.ts`](db/dashboard.ts) |
| Writes | Thin Server Actions in [`app/actions/`](app/actions) calling plain functions in [`lib/`](lib) (e.g. [`lib/trips.ts`](lib/trips.ts)) |
| Identity | [`lib/session.ts`](lib/session.ts) |
| Money | [`lib/money.ts`](lib/money.ts), [`lib/balances.ts`](lib/balances.ts) |
| Automations | [`lib/automations.ts`](lib/automations.ts) |

**Trip URLs vs invite links.** A trip lives at `/trip/<slug>`, where the slug is
the name plus 10 random characters. Only members can see it; everyone else gets
an "invite-only" page. Joining needs the separate invite code at
`/join/<code>` (12 random characters), which the organiser can reset from
Updates if it leaks. Both come from `node:crypto` ([`lib/codes.ts`](lib/codes.ts)).

**Identity without accounts.** Joining sets an httpOnly cookie holding an opaque
session token; `member_sessions` ties that token to a member of one trip. One
browser can be a member of many trips, and one member can be signed in on many
browsers. Every Server Action calls `requireMember()` before it writes, because
actions are reachable by direct POST, not just through the UI.

**Other devices.** From Updates → "Use on another device", a member gets a QR
code / link (`/link/<token>`) that signs a second browser in as them. It works
once and expires after 10 minutes; only a SHA-256 of the token is stored. Opening
the link only shows "Continue as …" — the sign-in happens on the button's POST,
so chat apps that pre-fetch links for previews can't spend it.

**Money is integer cents** end to end. Balances are derived from expenses,
splits and recorded payments; the settle-up suggestions are computed fresh on
every read rather than stored, so they can never drift from the ledger. Only
payments people actually made are persisted.

## Automations and n8n

The app **never sends anything itself**. Anything with an outside effect is
queued in the `outbox` table for an external runner to pick up:

```sql
-- what n8n polls
SELECT * FROM outbox
 WHERE status = 'pending' AND run_after <= now()
 ORDER BY run_after
 LIMIT 20;

-- ...and writes back when it's handled
UPDATE outbox SET status = 'done', processed_at = now() WHERE id = $1;
UPDATE outbox SET status = 'failed', attempts = attempts + 1, last_error = $2 WHERE id = $1;
```

| `kind` | Queued when | Payload |
|---|---|---|
| `vote_reminder` | trip created; due 24h before the deadline | `{ slug, tripName }` |
| `calendar_invite` | dates lock | `{ start, end, tripName, slug }` |
| `payment_reminder` | an expense is added | `{ expenseId }` |
| `settle_up_summary` | reserved for the trip being marked done | `{ }` |

`dedupe_key` is uniquely indexed, so re-queuing the same reminder is a no-op and
the app can be careless about calling `enqueue()` more than once. Turning off
Automations on the Updates screen flips `trips.automations_enabled`, after which
nothing new is queued.

### Driving the state machine

State changes stay in the app, not the runner. When the voting deadline passes,
the winning range is locked via a guarded `UPDATE ... WHERE phase = 'voting'`, so
exactly one caller wins the transition and queues the follow-up work — n8n only
has to send things.

That transition runs lazily whenever someone loads the trip, which is enough for
correctness but not if nobody opens the app. So there's also a scheduled hook:

```
POST /api/automations/tick
x-lakad-secret: $AUTOMATION_SECRET

→ { "checked": 1, "locked": [{ "slug": "cabo-reunion", "start": "2026-12-12", "end": "2026-12-15" }] }
```

It advances every trip whose deadline has passed and is safe to call as often as
you like — a second call returns `{ "checked": 0 }`. Set `AUTOMATION_SECRET` in
the environment and point an n8n Schedule trigger at it (every 5 minutes is
plenty), then have the same workflow drain the `outbox`.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run db:generate` | write a migration from schema changes |
| `npm run db:migrate` | apply migrations |
| `npm run db:seed` | rebuild the demo trip (destructive for that trip only) |
| `npm run db:studio` | Drizzle Studio |

## Photography

Photos are from Wikimedia Commons under CC BY / CC BY-SA and are credited at
[`/credits`](app/credits/page.tsx). Source and licence for each travel with the
image in [`lib/images.ts`](lib/images.ts).
