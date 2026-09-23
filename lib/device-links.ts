import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { deviceLinks, members, trips } from "@/db/schema";

export const DEVICE_LINK_MINUTES = 10;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issues a fresh link for `memberId`, voiding any earlier unused one. Returns the raw token. */
export async function issueDeviceLink(memberId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DEVICE_LINK_MINUTES * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .delete(deviceLinks)
      .where(and(eq(deviceLinks.memberId, memberId), isNull(deviceLinks.usedAt)));
    await tx.insert(deviceLinks).values({ tokenHash: hash(token), memberId, expiresAt });
  });

  return { token, expiresAt };
}

/** Who a still-valid link would sign you in as. Read-only, so link previews can't spend it. */
export async function peekDeviceLink(token: string) {
  const [row] = await db
    .select({
      memberId: members.id,
      memberName: members.name,
      tripId: trips.id,
      tripName: trips.name,
      slug: trips.slug,
    })
    .from(deviceLinks)
    .innerJoin(members, eq(members.id, deviceLinks.memberId))
    .innerJoin(trips, eq(trips.id, members.tripId))
    .where(
      and(
        eq(deviceLinks.tokenHash, hash(token)),
        isNull(deviceLinks.usedAt),
        gt(deviceLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
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
