"use client";

import { useState, useTransition } from "react";
import { joinTrip } from "@/app/actions/trips";

export function JoinForm({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const ready = name.trim().length > 0;

  return (
    <form
      className="flex flex-col flex-1 lg:flex-none lg:bg-surface lg:border lg:border-line lg:rounded-[20px] lg:p-6"
      action={(formData) =>
        start(async () => {
          setError(null);
          const result = await joinTrip(formData);
          if (result?.error) setError(result.error);
        })
      }
    >
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor="join-name" className="font-semibold text-[12px] text-ink2 mb-2">
        What should we call you?
      </label>
      <input
        id="join-name"
        name="name"
        value={name}
        autoFocus
        maxLength={60}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your first name"
        className="bg-bg border-[1.5px] border-accent rounded-[16px] px-4 py-[15px] font-medium text-[16px] outline-none mb-2.5 placeholder:text-ink2/60"
      />
      <p className="text-[12px] leading-[1.45] text-ink2 mb-auto lg:mb-0">
        No sign-up now — add an email later if you want reminders and the calendar invite.
      </p>
      {error && <p className="text-[12px] text-warn mt-3">{error}</p>}
      <div className="pt-[18px] lg:pt-5">
        <button
          type="submit"
          disabled={!ready || pending}
          className="w-full bg-accent text-accent-ink rounded-[16px] p-4 text-center font-semibold text-[16px] cursor-pointer hover:opacity-90 disabled:opacity-45"
        >
          {pending ? "Joining…" : "Join trip"}
        </button>
      </div>
    </form>
  );
}
