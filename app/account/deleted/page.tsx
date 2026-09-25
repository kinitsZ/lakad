import Link from "next/link";
import { BrandBar } from "@/components/brand-bar";

export const metadata = { title: "Account deleted · Lakad" };

export default function AccountDeletedPage() {
  return (
    <div className="flex flex-col flex-1">
      <BrandBar />
      <main className="mx-auto w-full max-w-[430px] px-[22px] pt-10 pb-16 flex flex-col">
        <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-[-0.025em] mb-3">
          Your account is deleted
        </h1>
        <p className="text-[14px] leading-[1.5] text-ink2 mb-7">
          Your account, email and photo are gone, and you&rsquo;ve been signed out. Thanks for
          planning with Lakad.
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
