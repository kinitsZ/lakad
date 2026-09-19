import { notFound, redirect } from "next/navigation";
import { TripTabBar, TripTopNav } from "@/components/trip-nav";
import { getTripContext } from "@/db/queries";

export default async function TripLayout({
  children,
  params,
}: LayoutProps<"/trip/[slug]">) {
  const { slug } = await params;
  const context = await getTripContext(slug);
  if (!context) notFound();

  // The whole product is link-first: if you haven't joined yet, join first.
  if (!context.currentMember) redirect(`/join/${slug}`);

  return (
    <div className="flex flex-col flex-1">
      <TripTopNav slug={slug} member={context.currentMember} />
      <div className="flex-1 pb-[76px] lg:pb-0">{children}</div>
      <TripTabBar slug={slug} />
    </div>
  );
}
