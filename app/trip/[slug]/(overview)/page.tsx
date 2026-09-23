import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DashboardDesktop } from "@/components/dashboard-desktop";
import { DashboardMobile } from "@/components/dashboard-mobile";
import { getDashboard } from "@/db/dashboard";
import { getTripContext } from "@/db/queries";
import { PageTransition } from "@/components/page-transition";

export async function generateMetadata({ params }: PageProps<"/trip/[slug]">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  return {
    title: context?.currentMember ? `${context.trip.name} · Lakad` : "Lakad",
  };
}

export default async function TripDashboardPage({ params }: PageProps<"/trip/[slug]">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context || !context.currentMember) notFound();

  const summary = await getDashboard(context);
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const inviteUrl = `${protocol}://${host}/join/${context.trip.inviteCode}`;

  return (
    <PageTransition>
      <>
        <DashboardMobile
          slug={slug}
          trip={context.trip}
          members={context.members}
          summary={summary}
          inviteUrl={inviteUrl}
          needsEmail={Boolean(context.currentMember?.noAccount)}
        />
        <DashboardDesktop
          slug={slug}
          trip={context.trip}
          members={context.members}
          summary={summary}
          isOrganiser={Boolean(context.currentMember?.isOrganiser)}
          needsEmail={Boolean(context.currentMember?.noAccount)}
        />
      </>
    </PageTransition>
  );
}
