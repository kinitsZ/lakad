import Link from "next/link";
import { BrandBar } from "@/components/brand-bar";

/** What a non-member sees at a trip URL. Deliberately says nothing about the trip. */
export function InviteOnly() {
  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[430px] px-[22px] pt-10 pb-16 flex flex-col">
        <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
          This trip is invite-only
        </h1>
        <p className="text-[14px] leading-[1.5] text-ink2 mb-3">
          Ask someone on the trip for its invite link — it looks like{" "}
          <span className="font-semibold text-ink">…/join/</span> followed by a code.
        </p>
        <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
          Already joined on another device? Open the trip there, go to Updates, and use
          &ldquo;Use on another device&rdquo;.
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
