import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { deviceLinks, members, trips } from "@/db/schema";

export const DEVICE_LINK_MINUTES = 10;
/** Sign-in links inside emails: people don't always read mail straight away. */
export const EMAIL_LINK_DAYS = 7;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issues a fresh link for `memberId`, voiding any earlier unused one. Returns the raw token. */
export async function issueDeviceLink(memberId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DEVICE_LINK_MINUTES * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .delete(deviceLinks)
      .where(
        and(
          eq(deviceLinks.memberId, memberId),
          eq(deviceLinks.purpose, "device"),
          isNull(deviceLinks.usedAt),
        ),
      );
    await tx
      .insert(deviceLinks)
      .values({ tokenHash: hash(token), memberId, expiresAt, purpose: "device" });
  });

  return { token, expiresAt };
}

/**
 * A personal sign-in link for one email. Unlike device links, issuing one doesn't
 * cancel others — each email carries its own. Returns the raw token.
 */
export async function issueEmailLink(memberId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + EMAIL_LINK_DAYS * 24 * 60 * 60 * 1000);
  await db
    .insert(deviceLinks)
    .values({ tokenHash: hash(token), memberId, expiresAt, purpose: "email" });
  return token;
}

/**
 * Who a link belongs to, and whether it can still be spent. Read-only, so link
 * previews and email scanners can't use it up. A spent link is still recognised,
 * so a browser that's already signed in as that member can just be sent through.
 */
export async function peekDeviceLink(token: string) {
  const [row] = await db
    .select({
      memberId: members.id,
      memberName: members.name,
      tripId: trips.id,
      tripName: trips.name,
      slug: trips.slug,
      usedAt: deviceLinks.usedAt,
      expiresAt: deviceLinks.expiresAt,
    })
    .from(deviceLinks)
    .innerJoin(members, eq(members.id, deviceLinks.memberId))
    .innerJoin(trips, eq(trips.id, members.tripId))
    .where(eq(deviceLinks.tokenHash, hash(token)))
    .limit(1);
  if (!row) return null;
  const { usedAt, expiresAt, ...link } = row;
  return { ...link, usable: !usedAt && expiresAt.getTime() > Date.now() };
}

/**
 * Where to go after signing in. Only pages inside the link's own trip are allowed,
 * so a crafted `next` can't bounce people to another site or another trip.
 */
export function safeNext(next: string | null | undefined, slug: string) {
  const home = `/trip/${slug}`;
  if (!next || next.length > 200) return home;
  if (next !== home && !next.startsWith(`${home}/`)) return home;
  if (/[\\]|\/\/|\.\./.test(next)) return home;
  return next;
}

/** Spends the link. The guarded UPDATE means only one device can ever win it. */
export async function redeemDeviceLink(token: string) {
  const [spent] = await db
    .update(deviceLinks)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(deviceLinks.tokenHash, hash(token)),
        isNull(deviceLinks.usedAt),
        gt(deviceLinks.expiresAt, new Date()),
      ),
    )
    .returning({ memberId: deviceLinks.memberId });
  if (!spent) return null;

  const [row] = await db
    .select({ memberId: members.id, tripId: members.tripId, slug: trips.slug })
    .from(members)
    .innerJoin(trips, eq(trips.id, members.tripId))
    .where(eq(members.id, spent.memberId))
    .limit(1);
  return row ?? null;
}
