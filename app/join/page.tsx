import Link from "next/link";
import { BrandBar } from "@/components/brand-bar";
import { InviteForm } from "@/components/invite-form";

export const metadata = { title: "Open an invite · Lakad" };

export default function OpenInvitePage() {
  return (
    <>
      <BrandBar />
      <div className="mx-auto w-full max-w-[430px] lg:max-w-[520px] px-[22px] lg:px-6 py-8 lg:py-16">
        <Link
          href="/"
          className="font-medium text-[13px] text-ink2 hover:text-ink mb-6 inline-block"
        >
          ← Back
        </Link>

        <h1 className="font-display font-semibold text-[30px] lg:text-[38px] leading-[1.08] tracking-[-0.025em] mb-3">
          Open an invite
        </h1>
        <p className="text-[14px] leading-[1.55] text-ink2 mb-7">
          Someone sent you a link to a trip. Paste it below and you&rsquo;ll go
          straight to the join page — no account needed.
        </p>

        <InviteForm />
      </div>
    </>
  );
}
