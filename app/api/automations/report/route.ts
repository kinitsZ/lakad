import { z } from "zod";
import { reportResults } from "@/lib/automations-send";
import { rejectUnlessAuthorized } from "../secret";

const bodySchema = z.object({
  results: z
    .array(
      z.object({
        jobId: z.string().uuid(),
        ok: z.boolean(),
        error: z.string().max(500).optional(),
      }),
    )
    .max(500),
});

/**
 * The runner reports what it sent:
 *
 *   POST /api/automations/report
 *   x-lakad-secret: $AUTOMATION_SECRET
 *   { "results": [{ "jobId": "…", "ok": true }, { "jobId": "…", "ok": false, "error": "…" }] }
 *
 * A job is done when all its emails succeeded. Otherwise it retries with a growing
 * delay, and is marked failed after 5 attempts.
 */
export async function POST(request: Request) {
  const denied = rejectUnlessAuthorized(request);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Expected { results: [{ jobId, ok, error? }] }" }, { status: 400 });
  }

  return Response.json(await reportResults(parsed.data.results));
}
