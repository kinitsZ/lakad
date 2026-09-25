"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { forgetClaimedMembers } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { getSessionToken } from "@/lib/session";

/** Signs out of the account, and this browser stops acting as the account's spots. */
export async function signOut() {
  const guest = await getSessionToken();
  await auth.api.signOut({ headers: await headers() });
  if (guest) await forgetClaimedMembers(guest);
  redirect("/");
}
