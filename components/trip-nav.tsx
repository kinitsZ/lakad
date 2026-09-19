"use client";

import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui";
import type { MemberView } from "@/db/queries";

const desktopLinks = [
  { label: "Trip", href: "" },
  { label: "Dates", href: "/dates" },
  { label: "Destination", href: "/destinations" },
  { label: "Itinerary", href: "/itinerary" },
  { label: "Expenses", href: "/expenses" },
];

const tabs = [
  { label: "Trip", href: "", matches: [""] },
  { label: "Vote", href: "/dates", matches: ["/dates", "/destinations"] },
  { label: "Plan", href: "/itinerary", matches: ["/itinerary"] },
  { label: "Money", href: "/expenses", matches: ["/expenses"] },
];

function useSegment(slug: string) {
  const pathname = usePathname();
  const base = `/trip/${slug}`;
  return pathname.startsWith(base) ? pathname.slice(base.length) : "";
}

export function CopyLinkButton({
  url,
  className = "",
  label = "Copy link",
  copiedLabel = "Copied",
}: {
  url: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked — the link is on screen to copy by hand.
    }
  }

  return (
    <button type="button" onClick={copy} className={`cursor-pointer ${className}`}>
      {copied ? copiedLabel : label}
    </button>
  );
}

export function TripTopNav({
  slug,
  member,
}: {
  slug: string;
  member: MemberView;
}) {
  const segment = useSegment(slug);
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/join/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignored — nothing actionable for the user here
    }
  }

  return (
    <div className="hidden lg:block border-b border-line bg-surface">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3.5">
      <div className="flex items-center gap-[26px]">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={19} className="text-accent" />
          <div className="font-display font-bold text-[16px] text-ink">Tripsync</div>
        </Link>
        <nav className="flex gap-5 text-[13px] font-medium">
          {desktopLinks.map((link) => {
            const active = segment === link.href;
            return (
              <Link
                key={link.label}
                href={`/trip/${slug}${link.href}`}
                aria-current={active ? "page" : undefined}
                className={
                  active ? "text-ink font-semibold" : "text-ink2 hover:text-ink"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={copyInvite}
          className="border border-line rounded-full px-[13px] py-[7px] font-semibold text-[12px] text-ink2 cursor-pointer hover:border-accent hover:text-ink"
        >
          {copied ? "Link copied" : "Copy invite link"}
        </button>
        <Avatar member={member} size={30} />
        </div>
      </div>
    </div>
  );
}

export function TripTabBar({ slug }: { slug: string }) {
  const segment = useSegment(slug);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-10 border-t border-line bg-surface">
      <div className="mx-auto max-w-[430px] flex justify-around pt-3 pb-[22px]">
        {tabs.map((tab) => {
          const active = tab.matches.includes(segment);
          return (
            <Link
              key={tab.label}
              href={`/trip/${slug}${tab.href}`}
              aria-current={active ? "page" : undefined}
              className={`text-[11px] text-center ${
                active ? "font-semibold text-accent" : "font-medium text-ink2"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
