import { notFound, redirect } from "next/navigation";
import { BrandBar } from "@/components/brand-bar";
import { JoinForm } from "@/components/join-form";
import { TripBanner } from "@/components/trip-banner";
import { AvatarStack } from "@/components/ui";
import { getMembers, getTripBySlug } from "@/db/queries";
import { syncTrip } from "@/lib/automations";
import { countdownLabel, rangeLabel } from "@/lib/format";
import { getCurrentMember } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const trip = await getTripBySlug(code);
  return { title: trip ? `Join ${trip.name} · Tripsync` : "Tripsync" };
}

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const found = await getTripBySlug(code);
  if (!found) notFound();
  const trip = await syncTrip(found);

  const already = await getCurrentMember(trip.id);
  if (already) redirect(`/trip/${trip.slug}`);

  const members = await getMembers(trip.id);
  const organiser = members.find((m) => m.isOrganiser);
  const names = members.map((m) => m.name.split(" ")[0]);
  const joinedSentence =
    names.length === 0
      ? "Be the first to join"
      : names.length === 1
        ? `${names[0]} is in`
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are in`;

  const phase = trip.phase[0].toUpperCase() + trip.phase.slice(1);

  return (
    <div className="flex flex-col flex-1">
      <BrandBar />

      <TripBanner
        name={trip.name}
        seed={trip.name}
        coverKey={trip.coverKey}
        className="h-[236px] lg:h-[300px]"
        columnClassName="max-w-[430px] lg:max-w-[1040px]"
        sizes="100vw"
        showName={false}
        priority
      >
        <div className="mx-auto w-full max-w-[430px] lg:max-w-[1040px] h-full flex items-end p-[18px] lg:px-6 lg:pb-7">
          {organiser && (
            <div className="bg-surface rounded-[14px] px-3 py-2 font-semibold text-[12px] text-ink2">
              Invited by {organiser.name}
            </div>
          )}
        </div>
      </TripBanner>

      <main className="mx-auto w-full max-w-[430px] lg:max-w-[1040px] px-[22px] lg:px-6 pt-[22px] lg:pt-10 pb-8 lg:pb-16 flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:items-start">
        <div className="flex flex-col">
          <h1 className="font-display font-semibold text-[30px] lg:text-[44px] leading-[1.08] tracking-[-0.025em] mb-2 lg:mb-3">
            {trip.name}
          </h1>
          <p className="text-[14px] lg:text-[16px] text-ink2 mb-4 lg:mb-6">
            {[trip.timeframeLabel, trip.nightsLabel].filter(Boolean).join(" · ")}
          </p>

          {members.length > 0 && (
            <div className="flex items-center gap-2.5 mb-[18px] lg:mb-7">
              <AvatarStack members={members} size={30} ring="surface" max={4} />
              <div className="text-[13px] lg:text-[14px] text-ink2">{joinedSentence}</div>
            </div>
          )}

          <div className="flex gap-2 lg:gap-3 mb-[22px] lg:mb-0">
            <div className="flex-1 bg-surface2 rounded-[14px] lg:rounded-[18px] p-3 lg:p-5">
              <div className="font-semibold text-[12px] text-ink2 mb-1">Phase</div>
              <div className="font-semibold text-[14px] lg:text-[16px]">
                {phase === "Voting" ? "Voting on dates" : phase}
              </div>
            </div>
            <div className="flex-1 bg-surface2 rounded-[14px] lg:rounded-[18px] p-3 lg:p-5">
              {trip.lockedStart && trip.lockedEnd ? (
                <>
                  <div className="font-semibold text-[12px] text-ink2 mb-1">Dates</div>
                  <div className="font-semibold text-[14px] lg:text-[16px] text-accent">
                    {rangeLabel(trip.lockedStart, trip.lockedEnd)}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-[12px] text-ink2 mb-1">
                    {trip.phase === "voting" ? "Closes in" : "Voting"}
                  </div>
                  <div className="font-semibold text-[14px] lg:text-[16px] text-accent">
                    {trip.phase === "voting" ? countdownLabel(trip.votingDeadline) : "Closed"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <JoinForm slug={trip.slug} />
      </main>
    </div>
  );
}
