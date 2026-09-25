"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markAllRead } from "@/app/actions/updates";
import { DeviceCard } from "@/components/device-card";
import { EmailCard } from "@/components/email-card";
import { InviteCard } from "@/components/invite-card";
import { Avatar, SectionLabel } from "@/components/ui";
import type { MemberView, UpdateView } from "@/db/queries";

export function UpdatesPanel({
  slug,
  tripId,
  updates,
  members,
  email,
  remindersEnabled,
  inviteCode,
  isOrganiser,
}: {
  slug: string;
  tripId: string;
  updates: UpdateView[];
  members: MemberView[];
  email: string | null;
  remindersEnabled: boolean;
  inviteCode: string;
  isOrganiser: boolean;
}) {
  const [pending, start] = useTransition();
  const [showAll, setShowAll] = useState(false);
  // On phones the settings cards sit under the list, so keep it short until asked.
  const MOBILE_LIMIT = 5;
  const position = new Map(updates.map((u, i) => [u.id, i]));
  const hiddenOnMobile = (id: string) => !showAll && (position.get(id) ?? 0) >= MOBILE_LIMIT;
  const hiddenCount = Math.max(0, updates.length - MOBILE_LIMIT);
  const byId = new Map(members.map((m) => [m.id, m]));
  const hasUnread = updates.some((u) => u.unread);

  const groups: ["Today" | "Earlier", UpdateView[]][] = [
    ["Today", updates.filter((u) => u.group === "Today")],
    ["Earlier", updates.filter((u) => u.group === "Earlier")],
  ];

  return (
    <div className="mx-auto w-full max-w-[430px] lg:max-w-[1040px] lg:px-6 lg:py-8">
      <header className="flex items-center justify-between px-5 lg:px-0 pt-3 lg:pt-0 pb-3.5 lg:pb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/trip/${slug}`}
            className="font-medium text-[14px] text-ink2 hover:text-ink lg:hidden"
          >
            Back
          </Link>
          <h1 className="font-display font-semibold text-[19px] lg:text-[32px] lg:tracking-[-0.025em]">
            Updates
          </h1>
        </div>
        <button
          type="button"
          onClick={() => start(() => void markAllRead(tripId))}
          disabled={!hasUnread || pending}
          className="font-semibold text-[12px] text-accent cursor-pointer disabled:text-ink2 disabled:cursor-default"
        >
          {hasUnread ? "Mark all read" : "All read"}
        </button>
      </header>

      <div className="px-[18px] lg:px-0 pb-8 lg:pb-0 flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
        <div className="flex flex-col gap-2.5">
          {!updates.length && (
            <p className="text-[13px] text-ink2 px-1">Nothing has happened yet.</p>
          )}
          {groups.map(([group, items]) => {
            if (!items.length) return null;
            const allHidden = items.every((u) => hiddenOnMobile(u.id));
            return (
              <section
                key={group}
                className={`flex-col gap-2.5 stagger-children ${allHidden ? "hidden lg:flex" : "flex"}`}
              >
                <div className="pl-1 mt-1.5 first:mt-0">
                  <SectionLabel>{group}</SectionLabel>
                </div>
                {items.map((update) => (
                  <article
                    key={update.id}
                    className={`rounded-[18px] px-[15px] py-3.5 gap-3 ${
                      hiddenOnMobile(update.id) ? "hidden lg:flex" : "flex"
                    } ${
                      update.unread && update.automated
                        ? "bg-accent-soft"
                        : "bg-surface border border-line"
                    } ${group === "Earlier" ? "opacity-75" : ""}`}
                  >
                    {update.memberId && byId.has(update.memberId) ? (
                      <Avatar member={byId.get(update.memberId)} size={32} />
                    ) : (
                      <div
                        className={`w-8 h-8 shrink-0 rounded-[11px] grid place-items-center font-bold text-[13px] ${
                          update.automated ? "bg-accent text-accent-ink" : "bg-surface2 text-ink2"
                        }`}
                        aria-hidden
                      >
                        {update.icon}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="font-semibold text-[14px] mb-[3px]">{update.title}</h2>
                      {update.body && (
                        <p className="text-[12px] leading-[1.45] text-ink2">{update.body}</p>
                      )}
                      <p className="text-[11px] text-ink2 mt-1.5">
                        {update.timeAgo}
                        {update.automated ? " · automatic" : ""}
                      </p>
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="lg:hidden self-center font-semibold text-[12px] text-accent px-3 py-2 cursor-pointer"
            >
              {showAll ? "Show fewer" : `Show all ${updates.length} updates`}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 lg:gap-4">
          <EmailCard tripId={tripId} email={email} remindersEnabled={remindersEnabled} />
          <DeviceCard tripId={tripId} />
          <InviteCard tripId={tripId} inviteCode={inviteCode} isOrganiser={isOrganiser} />
        </div>
      </div>
    </div>
  );
}
