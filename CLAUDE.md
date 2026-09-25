@AGENTS.md

# Project conventions

- **Business logic lives in `lib/` (and reads in `db/`), not in Server Actions.** A native mobile app is planned and will need a JSON API. Server Actions in `app/actions/` should stay thin: parse the form, call `requireMember()`, call a plain function from `lib/`, then revalidate/redirect. Those `lib/` functions take explicit inputs (e.g. `memberId`, parsed values) and must not import `next/*` — so a future `/api/v1` Route Handler can call the same function. When touching an existing action that holds logic, move that logic into `lib/` as part of the change.
- **Every database table enables Row Level Security.** Supabase exposes the `public` schema through its data API; RLS with no policies blocks that API while the app (connecting as the table owner) is unaffected. New `pgTable(...)` definitions in `db/schema.ts` must end with `.enableRLS()`.
