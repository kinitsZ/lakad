import { NextResponse } from "next/server";
import { claimGuestMembers } from "@/lib/accounts";
import { getSessionToken, getUser } from "@/lib/session";

/**
 * Where sign-in lands (`callbackURL`): attaches this browser's guest spots to the
 * account, then continues to `next` — a path on this site only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const destination = /^\/(?![\\/])/.test(next) && !next.includes("..") ? next : "/";

  const user = await getUser();
  const guest = await getSessionToken();
  if (user && guest) await claimGuestMembers(user.id, guest);

  return NextResponse.redirect(new URL(destination, url.origin));
}
