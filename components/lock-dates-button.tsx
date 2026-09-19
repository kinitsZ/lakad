"use client";

import { useTransition } from "react";
import { lockDatesNow } from "@/app/actions/voting";

export function LockDatesButton({ tripId }: { tripId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void lockDatesNow(tripId))}
      className="bg-accent text-accent-ink rounded-[13px] px-4 py-[11px] font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Locking…" : "Lock dates now"}
    </button>
  );
}
