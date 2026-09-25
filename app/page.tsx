import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, LogoMark } from "@/components/logo";
import { TripScene } from "@/components/trip-scene";
import { getTripsForSession } from "@/db/queries";
import { rangeLabel } from "@/lib/format";
import { getSessionToken } from "@/lib/session";

const steps = [
  {
    title: "Create & share",
    body: "Name the trip, drop a cover photo, set a voting deadline.",
  },
  {
    title: "Friends vote",
    body: "They tap the link, add a name, mark free days and favourite spots.",
  },
  {
    title: "Lakad runs it",
    body: "Dates lock, invites land in calendars, expenses settle up.",
  },
];

export default async function LandingPage() {
  const token = await getSessionToken();
  const myTrips = token ? await getTripsForSession(token) : [];

  return (
    <div className="w-full">
      <header className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] flex items-center justify-between px-[22px] lg:px-6 py-2.5 lg:py-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={18} className="text-accent" />
          <div className="font-display font-bold text-[15px] lg:text-[16px]">Lakad</div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/join"
            className="hidden lg:block border border-line rounded-full px-[13px] py-[7px] font-semibold text-[12px] text-ink2 hover:border-accent hover:text-ink"
          >
            I have an invite link
          </Link>
          <Link
            href="/new"
            className="hidden lg:block bg-accent text-accent-ink rounded-full px-4 py-2 font-semibold text-[12px] hover:opacity-90"
          >
            Plan a trip
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] px-[22px] lg:px-6 pt-[26px] lg:pt-14 pb-12 lg:pb-20">
        {myTrips.length > 0 && (
          <section className="mb-8 lg:mb-14" aria-labelledby="your-trips">
            <h2
              id="your-trips"
              className="font-semibold text-[11px] lg:text-[12px] tracking-[0.12em] uppercase text-ink2 mb-3"
            >
              Your trips
            </h2>
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-2.5 lg:gap-3.5">
              {myTrips.map((trip) => (
                <Link
                  key={trip.slug}
                  href={`/trip/${trip.slug}`}
                  className="flex items-center justify-between gap-3 bg-surface border border-line rounded-[16px] px-4 py-3.5 hover:border-accent"
                >
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-[16px] truncate">
                      {trip.name}
                    </div>
                    <div className="text-[12px] text-ink2 truncate">
                      {[
                        trip.phase[0].toUpperCase() + trip.phase.slice(1),
                        trip.lockedStart && trip.lockedEnd
                          ? rangeLabel(trip.lockedStart, trip.lockedEnd)
                          : trip.timeframeLabel,
                        `as ${trip.memberName.split(" ")[0]}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-[12px] text-accent">Open</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 bg-accent-soft text-accent rounded-full px-3 py-1.5 font-semibold text-[12px] lg:text-[13px] mb-[18px]">
              No account needed to join
            </p>

            <h1 className="font-display font-semibold text-[35px] lg:text-[60px] leading-[1.02] tracking-[-0.03em] mb-3 lg:mb-5">
              Get six friends to agree on one weekend.
            </h1>

            <p className="text-[14px] lg:text-[17px] leading-[1.5] text-ink2 mb-[18px] lg:mb-7 lg:max-w-[520px]">
              Share one link. Everyone votes on dates and places, builds the itinerary, and splits
              the bill — reminders and calendar invites happen on their own.
            </p>

            <div className="flex flex-col lg:flex-row gap-2.5 lg:gap-3">
              <Link
                href="/new"
                className="bg-accent text-accent-ink rounded-[16px] p-4 lg:px-8 text-center font-semibold text-[16px] hover:opacity-90"
              >
                Plan a trip
              </Link>
              <Link
                href="/join"
                className="border border-line text-ink rounded-[16px] p-[15px] lg:px-8 text-center font-semibold text-[15px] hover:border-accent"
              >
                I have an invite link
              </Link>
            </div>

            <div className="flex items-center gap-2.5 mt-4 lg:mt-7 mb-[18px] lg:mb-0">
              <div className="text-[12px] lg:text-[13px] text-ink2">
                No account, no app — just a link your friends can open.
              </div>
            </div>
          </div>

          <TripScene className="mt-8 lg:mt-0 aspect-[4/3] lg:aspect-[4/5] lg:max-h-[560px] rounded-[24px] lg:rounded-[28px] ring-1 ring-line shadow-frame" />
        </section>

        <section className="border-t border-line pt-4 lg:pt-14 lg:mt-16">
          <h2 className="font-semibold text-[11px] lg:text-[12px] tracking-[0.12em] uppercase text-ink2 mb-3 lg:mb-6">
            How it works
          </h2>
          <ol className="flex flex-col lg:grid lg:grid-cols-3 gap-[9px] lg:gap-5">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex lg:flex-col gap-3 lg:gap-4 items-start bg-surface2 rounded-[16px] lg:rounded-[20px] px-[13px] py-[11px] lg:p-6"
              >
                <div className="w-[26px] h-[26px] lg:w-9 lg:h-9 shrink-0 rounded-[9px] lg:rounded-xl bg-accent text-accent-ink grid place-items-center font-bold text-[13px] lg:text-[16px]">
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold text-[15px] lg:text-[18px] mb-[3px] lg:mb-2">
                    {step.title}
                  </div>
                  <div className="text-[13px] lg:text-[14px] leading-[1.45] lg:leading-[1.55] text-ink2">
                    {step.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-line mt-12 lg:mt-20 pt-10 lg:pt-14 flex flex-col items-center text-center">
          <Link href="/" aria-label="Lakad home">
            <Logo markSize={26} textClassName="font-display font-bold text-[22px]" />
          </Link>
          <p className="text-[13px] lg:text-[14px] text-ink2 mt-3 max-w-[340px] leading-[1.5]">
            Plan trips together — one link, no accounts, no spreadsheets.
          </p>
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-[13px] font-medium text-ink2"
          >
            <Link href="/new" className="hover:text-ink">
              Plan a trip
            </Link>
            <Link href="/join" className="hover:text-ink">
              I have an invite link
            </Link>
            <Link href="/credits" className="hover:text-ink">
              Photo credits
            </Link>
          </nav>
          <p className="text-[12px] text-ink2/70 mt-8">© {new Date().getFullYear()} Lakad</p>
        </footer>
      </main>
    </div>
  );
}
