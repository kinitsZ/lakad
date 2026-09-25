import Link from "next/link";
import { redirect } from "next/navigation";
import { redeemLink } from "@/app/actions/devices";
import { BrandBar } from "@/components/brand-bar";
import { peekDeviceLink, safeNext } from "@/lib/device-links";
import { getCurrentMember } from "@/lib/session";

export const metadata = {
  title: "Sign in on this device · Lakad",
  // The token is in the URL; keep it out of Referer headers and search indexes.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function DeviceLinkPage({ params, searchParams }: PageProps<"/link/[token]">) {
  const { token } = await params;
  const { next } = await searchParams;
  const found = await peekDeviceLink(token);

  if (found) {
    const destination = safeNext(typeof next === "string" ? next : null, found.slug);
    // Already signed in here as this person (e.g. tapping the same email again): go straight on.
    const me = await getCurrentMember(found.tripId);
    if (me?.id === found.memberId) redirect(destination);
  }
  const link = found?.usable ? found : null;

  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[430px] px-[22px] pt-10 pb-16 flex-1 flex flex-col">
        {link ? (
          <form action={redeemLink} className="flex flex-col">
            <input type="hidden" name="token" value={token} />
            {typeof next === "string" && <input type="hidden" name="next" value={next} />}
            <p className="font-semibold text-[12px] text-ink2 mb-2">{link.tripName}</p>
            <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
              Continue as {link.memberName.split(" ")[0]}?
            </h1>
            <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
              This signs this device in as {link.memberName} on {link.tripName}. Your other device
              stays signed in.
            </p>
            <button
              type="submit"
              className="w-full bg-accent text-accent-ink rounded-[16px] p-4 font-semibold text-[16px] cursor-pointer hover:opacity-90"
            >
              Continue as {link.memberName.split(" ")[0]}
            </button>
            <p className="text-[12px] leading-[1.45] text-ink2 mt-3">
              Not you? Close this page — nothing happens unless you tap the button.
            </p>
          </form>
        ) : (
          <div className="flex flex-col">
            <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
              This link has expired or was already used
            </h1>
            <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
              Sign-in links work once and expire (after 10 minutes for a QR code, 7 days from an
              email). If you&rsquo;re signed in on another device, open the trip there, go to
              Updates, and use &ldquo;Use on another device&rdquo;.
            </p>
            <Link
              href="/"
              className="w-full border border-line rounded-[16px] p-4 text-center font-semibold text-[15px] hover:border-accent"
            >
              Go to Lakad
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
