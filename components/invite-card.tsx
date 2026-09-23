"use client";

import { useState, useTransition } from "react";
import { resetInviteLink } from "@/app/actions/trips";

export function InviteCard({
  tripId,
  inviteCode,
  isOrganiser,
}: {
  tripId: string;
  inviteCode: string;
  isOrganiser: boolean;
}) {
  const [pending, start] = useTransition();
  const [code, setCode] = useState(inviteCode);
  const [note, setNote] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/join/${code}`);
      setNote("Link copied");
    } catch {
      setNote(null);
    }
  }

  function reset() {
    if (!confirm("Reset the invite link? The old link stops working — people already in the trip stay in.")) {
      return;
    }
    start(async () => {
      const result = await resetInviteLink(tripId);
      if ("error" in result) setNote(result.error ?? null);
      else {
        setCode(result.inviteCode);
        setNote("New link ready — the old one no longer works");
      }
    });
  }

  const button =
    "border border-line rounded-full px-[13px] py-[7px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent disabled:opacity-45";

  return (
    <section className="bg-surface border border-line rounded-[16px] lg:rounded-[20px] px-[15px] lg:px-[18px] py-[13px] lg:py-[18px]">
      <h2 className="font-display font-semibold text-[15px] mb-1">Invite link</h2>
      <p className="text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3">
        Anyone with this link can join.{" "}
        {isOrganiser ? "If it ends up somewhere it shouldn't, reset it." : ""}
      </p>
      <p className="font-mono text-[12px] text-ink bg-bg border border-line rounded-[10px] px-3 py-2 mb-3 break-all">
        /join/{code}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={button}>
          Copy link
        </button>
        {isOrganiser && (
          <button type="button" onClick={reset} disabled={pending} className={button}>
            {pending ? "Resetting…" : "Reset link"}
          </button>
        )}
      </div>
      {note && <p className="text-[11px] text-ink2 mt-2">{note}</p>}
    </section>
  );
}
