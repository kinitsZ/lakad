import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Returns an error response unless the request carries the shared automation secret. */
export function rejectUnlessAuthorized(request: Request): Response | null {
  const secret = process.env.AUTOMATION_SECRET;
  if (!secret) {
    return Response.json({ error: "AUTOMATION_SECRET is not set on the server." }, { status: 503 });
  }
  const given = request.headers.get("x-lakad-secret") ?? "";
  // Hashing first gives equal lengths, which timingSafeEqual requires.
  if (!timingSafeEqual(digest(given), digest(secret))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
