import Link from "next/link";
import { setRemindersFromLink } from "@/app/actions/unsubscribe";
import { BrandBar } from "@/components/brand-bar";
import { getReminderSettings } from "@/db/queries";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

export const metadata = {
  title: "Reminder emails · Lakad",
  // The token is in the URL; keep it out of Referer headers and search indexes.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

/**
 * Where "Stop these emails" lands. Opening it changes nothing — mail scanners open
 * links automatically — so the change happens on the button's POST.
 */
export default async function UnsubscribePage({ params }: PageProps<"/unsubscribe/[token]">) {
  const { token } = await params;
  const memberId = readUnsubscribeToken(token);
  const settings = memberId ? await getReminderSettings(memberId) : null;

  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[430px] px-[22px] pt-10 pb-16 flex flex-col">
        {!settings ? (
          <>
            <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
              This link doesn&rsquo;t work
            </h1>
            <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
              It may have been copied incompletely. You can also turn reminder emails off from the
              trip&rsquo;s Updates page.
            </p>
            <Link
              href="/"
              className="w-full border border-line rounded-[16px] p-4 text-center font-semibold text-[15px] hover:border-accent"
            >
              Go to the home page
            </Link>
          </>
        ) : settings.remindersEnabled ? (
          <form action={setRemindersFromLink} className="flex flex-col">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="enabled" value="false" />
            <p className="font-semibold text-[12px] text-ink2 mb-2">{settings.tripName}</p>
            <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
              Stop reminder emails for this trip?
            </h1>
            <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
              You&rsquo;ll stop getting voting nudges, the calendar invite and payment reminders for{" "}
              {settings.tripName}. You stay on the trip, and you can turn them back on anytime.
            </p>
            <button
              type="submit"
              className="w-full bg-accent text-accent-ink rounded-[16px] p-4 font-semibold text-[16px] cursor-pointer hover:opacity-90"
            >
              Stop emails
            </button>
          </form>
        ) : (
          <form action={setRemindersFromLink} className="flex flex-col">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="enabled" value="true" />
            <p className="font-semibold text-[12px] text-ink2 mb-2">{settings.tripName}</p>
            <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
              Reminder emails stopped
            </h1>
            <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
              You won&rsquo;t get reminder emails for {settings.tripName}. Changed your mind?
            </p>
            <button
              type="submit"
              className="w-full border border-line rounded-[16px] p-4 font-semibold text-[15px] cursor-pointer hover:border-accent"
            >
              Turn them back on
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
