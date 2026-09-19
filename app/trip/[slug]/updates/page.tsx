import { notFound } from "next/navigation";
import { UpdatesPanel } from "@/components/updates-panel";
import { getTripContext, getUpdates } from "@/db/queries";

export const metadata = { title: "Updates · Tripsync" };

export default async function UpdatesPage({ params }: PageProps<"/trip/[slug]/updates">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const updates = await getUpdates(context.trip.id, context.currentMember.id);

  return (
    <UpdatesPanel
      slug={slug}
      tripId={context.trip.id}
      updates={updates}
      members={context.members}
      automationsEnabled={context.trip.automationsEnabled}
    />
  );
}
