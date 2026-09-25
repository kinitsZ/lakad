"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAccount as deleteAccountData, forgetClaimedMembers } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { getAuthSession, getSessionToken } from "@/lib/session";

/** Deleting needs a recent sign-in, in case someone else is at an unlocked computer. */
const RECENT_SIGN_IN_MS = 60 * 60 * 1000;

/** Signs out of the account, and this browser stops acting as the account's spots. */
export async function signOut() {
  const guest = await getSessionToken();
  await auth.api.signOut({ headers: await headers() });
  if (guest) await forgetClaimedMembers(guest);
  redirect("/");
}

/** Permanently deletes the signed-in account (see lib/accounts.ts for what that removes). */
export async function deleteAccount(formData: FormData) {
  const current = await getAuthSession();
  if (!current) return { error: "You're not signed in." };
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    return { error: 'Type "delete" to confirm.' };
  }
  if (Date.now() - new Date(current.session.createdAt).getTime() > RECENT_SIGN_IN_MS) {
    return { error: "For your security, sign in again, then delete your account.", reauth: true };
  }

  const userId = current.user.id;
  await auth.api.signOut({ headers: await headers() });
  await deleteAccountData(userId);
  redirect("/account/deleted");
}
