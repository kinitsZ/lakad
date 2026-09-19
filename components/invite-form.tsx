"use client";

import { useState, useTransition } from "react";
import { openInvite } from "@/app/actions/invite";

export function InviteForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");

  return (
    <form
      className="flex flex-col"
      action={(formData) =>
        start(async () => {
          setError(null);
          const result = await openInvite(formData);
          if (result?.error) setError(result.error);
        })
      }
    >
      <label htmlFor="invite-link" className="font-semibold text-[12px] text-ink2 mb-2">
        Paste your invite link
      </label>
      <input
        id="invite-link"
        name="link"
        value={link}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          setLink(event.target.value);
          setError(null);
        }}
        placeholder="tripsync.app/join/…"
        className="bg-bg border-[1.5px] border-accent rounded-[16px] px-4 py-[15px] font-medium text-[16px] outline-none mb-2.5 placeholder:text-ink2/60"
      />
      <p className="text-[12px] leading-[1.45] text-ink2">
        The whole link works, and so does just the code on the end of it.
      </p>

      {error && (
        <p className="bg-warn-soft text-ink rounded-[14px] px-3.5 py-3 text-[12px] mt-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!link.trim() || pending}
        className="mt-5 bg-accent text-accent-ink rounded-[16px] p-4 text-center font-semibold text-[16px] cursor-pointer hover:opacity-90 disabled:opacity-45"
      >
        {pending ? "Looking…" : "Open trip"}
      </button>
    </form>
  );
}
