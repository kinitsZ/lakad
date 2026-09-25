import { notFound } from "next/navigation";
import { UpdatesPanel } from "@/components/updates-panel";
import { getTripContext, getUpdates } from "@/db/queries";
import { getCurrentMember } from "@/lib/session";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Updates · Lakad" };

export default async function UpdatesPage({ params }: PageProps<"/trip/[slug]/updates">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  // The roster never carries emails to the client; only your own is loaded, for this card.
  const [updates, me] = await Promise.all([
    getUpdates(context.trip.id, context.currentMember.id),
    getCurrentMember(context.trip.id),
  ]);

  return (
    <PageTransition>
      <UpdatesPanel
        slug={slug}
        tripId={context.trip.id}
        updates={updates}
        members={context.members}
        email={me?.email ?? null}
        remindersEnabled={me?.remindersEnabled ?? true}
        inviteCode={context.trip.inviteCode}
        isOrganiser={context.currentMember.isOrganiser}
      />
    </PageTransition>
  );
}
