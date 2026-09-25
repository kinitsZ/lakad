import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandBar } from "@/components/brand-bar";
import { JoinForm } from "@/components/join-form";
import { TripBanner } from "@/components/trip-banner";
import { AvatarStack } from "@/components/ui";
import { getMembers, getTripByInviteCode } from "@/db/queries";
import { syncTrip } from "@/lib/automations";
import { countdownLabel, rangeLabel } from "@/lib/format";
import { getCurrentMember, getUser } from "@/lib/session";
import { SignInOptions } from "@/components/social-sign-in";

export async function generateMetadata({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const trip = await getTripByInviteCode(code);
  return { title: trip ? `Join ${trip.name} · Lakad` : "Lakad" };
}

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const found = await getTripByInviteCode(code);
  if (!found) return <ExpiredInvite />;
  const trip = await syncTrip(found);

  const [already, user] = await Promise.all([getCurrentMember(trip.id), getUser()]);
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

        <div className="flex flex-col flex-1 lg:flex-none">
          <JoinForm code={trip.inviteCode} defaultName={user?.name.split(" ")[0] ?? ""} />
          {user ? (
            <p className="text-[12px] text-ink2 mt-3 text-center">
              Joining as {user.name} — this trip will be saved to your account.
            </p>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-3 text-[12px] text-ink2">
                <span className="h-px flex-1 bg-line" />
                or save it to an account
                <span className="h-px flex-1 bg-line" />
              </div>
              <SignInOptions next={`/join/${trip.inviteCode}`} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ExpiredInvite() {
  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[430px] px-[22px] pt-10 pb-16 flex flex-col">
        <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
          This invite link doesn&rsquo;t work
        </h1>
        <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
          It may have been reset by the trip&rsquo;s organiser, or copied incompletely. Ask whoever
          sent it for a fresh link.
        </p>
        <Link
          href="/"
          className="w-full border border-line rounded-[16px] p-4 text-center font-semibold text-[15px] hover:border-accent"
        >
          Go to the home page
        </Link>
      </main>
    </div>
  );
}
