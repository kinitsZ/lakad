import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DashboardDesktop } from "@/components/dashboard-desktop";
import { DashboardMobile } from "@/components/dashboard-mobile";
import { getDashboard } from "@/db/dashboard";
import { getTripContext } from "@/db/queries";

export async function generateMetadata({ params }: PageProps<"/trip/[slug]">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  return { title: context ? `${context.trip.name} · Tripsync` : "Tripsync" };
}

export default async function TripDashboardPage({ params }: PageProps<"/trip/[slug]">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context) notFound();

  const summary = await getDashboard(context);
  const host = (await headers()).get("host") ?? "tripsync.app";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const inviteUrl = `${protocol}://${host}/join/${slug}`;

  return (
    <>
      <DashboardMobile
        slug={slug}
        trip={context.trip}
        members={context.members}
        summary={summary}
        inviteUrl={inviteUrl}
      />
      <DashboardDesktop
        slug={slug}
        trip={context.trip}
        members={context.members}
        summary={summary}
        isOrganiser={Boolean(context.currentMember?.isOrganiser)}
      />
    </>
  );
}
