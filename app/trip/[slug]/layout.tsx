import { notFound } from "next/navigation";
import { InviteOnly } from "@/components/invite-only";
import { TripTabBar, TripTopNav } from "@/components/trip-nav";
import { getTripContext } from "@/db/queries";
import { getAccountView } from "@/lib/session";

export default async function TripLayout({
  children,
  params,
}: LayoutProps<"/trip/[slug]">) {
  const { slug } = await params;
  const [context, user] = await Promise.all([getTripContext(slug), getAccountView()]);
  if (!context) notFound();

  // Only the invite code (/join/<code>) lets people in; the trip URL alone doesn't.
  if (!context.currentMember) return <InviteOnly />;

  return (
    <div className="flex flex-col flex-1">
      <TripTopNav
        slug={slug}
        member={context.currentMember}
        inviteCode={context.trip.inviteCode}
        user={user}
      />
      <div className="flex-1 pb-[76px] lg:pb-0">{children}</div>
      <TripTabBar slug={slug} />
    </div>
  );
}
