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

**Optional accounts.** "Continue with Google" (Better Auth, [`lib/auth.ts`](lib/auth.ts),
tables prefixed `auth_`) ties a person's spots across trips and devices through
`members.user_id`. Joining still needs only a name. On sign-in, `/auth/claim` attaches
the guest spots this browser holds to the account ([`lib/accounts.ts`](lib/accounts.ts));
a trip where the account already has a spot is skipped rather than merged. On
sign-out the browser stops acting as the account's spots. "Who am I on this trip?"
checks the account first, then the guest cookie ([`lib/session.ts`](lib/session.ts)).

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

The app **never sends anything itself**, and the runner (n8n) **never touches the
database**. Anything with an outside effect is queued in the `outbox` table; the
runner makes two HTTP calls, both with the header `x-lakad-secret: $AUTOMATION_SECRET`:

```
POST /api/automations/tick          every ~5 minutes
→ {
    "checked": 1, "locked": [{ "slug": "…", "start": "2026-12-12", "end": "2026-12-15" }],
    "emails": [{
      "jobId": "…", "kind": "payment_reminder",
      "to": "priya@example.com", "toName": "Priya",
      "subject": "You owe $74.00 for Cabo Reunion",
      "text": "…", "html": "…"
    }],
    "skipped": [{ "jobId": "…", "kind": "vote_reminder", "reason": "everyone with an email has voted" }]
  }

POST /api/automations/report        after sending
{ "results": [{ "jobId": "…", "ok": true }, { "jobId": "…", "ok": false, "error": "…" }] }
→ { "done": 3, "retrying": 1, "failed": 0 }
```

`tick` first advances trips whose voting deadline has passed (locking the dates
with a guarded `UPDATE ... WHERE phase = 'voting'`, so exactly one caller wins),
then **claims** due jobs and returns them as finished emails. Recipients are
worked out at send time — only members who added an email, and e.g. only those
who still haven't voted — so the logic lives in
[`lib/automations-send.ts`](lib/automations-send.ts), not in the runner.

A claimed job is leased for 10 minutes: if it isn't reported (the runner crashed),
it comes back on its own. A job is `done` when all its emails succeeded; otherwise
it retries with a growing delay and is marked `failed` after 5 attempts. Jobs with
nobody to email are marked `done` with a `skipped: …` note.

| `kind` | Queued when | Emails |
|---|---|---|
| `vote_reminder` | trip created; due 24h before the deadline | members with an email who haven't voted |
| `calendar_invite` | dates lock | every member with an email, with "Add to Google Calendar" and `.ics` links (`/trip/<slug>/calendar.ics`) |
| `payment_reminder` | an expense is added (due 3 days later), or "Remind" is tapped | people who still owe money (or just the one reminded) |
| `settle_up_summary` | reserved for the trip being marked done | not sent yet |

`dedupe_key` is uniquely indexed, so re-queuing the same reminder is a no-op.
Reminder emails are per person: each member can switch theirs off on the Updates
screen (`members.reminders_enabled`) while keeping their address saved, and is then
left out of every email for that trip.

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
