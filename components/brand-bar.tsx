import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Desktop-only masthead for the pre-trip screens, which have no trip nav. */
export function BrandBar() {
  return (
    <div className="hidden lg:block border-b border-line bg-surface">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={19} className="text-accent" />
          <div className="font-display font-bold text-[16px] text-ink">Tripsync</div>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
