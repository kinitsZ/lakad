"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setMyEmail, setMyReminders } from "@/app/actions/updates";

export function EmailCard({
  tripId,
  email,
  remindersEnabled,
}: {
  tripId: string;
  email: string | null;
  remindersEnabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [on, setOn] = useState(remindersEnabled);

  function toggle() {
    const next = !on;
    setOn(next);
    start(async () => {
      const result = await setMyReminders(tripId, next);
      if (!result.ok) setOn(!next);
    });
  }
  const [editing, setEditing] = useState(!email);
  const [error, setError] = useState<string | null>(null);

  function save(formData: FormData) {
    start(async () => {
      setError(null);
      const result = await setMyEmail(tripId, formData);
      if (result.error) setError(result.error);
      else setEditing(!formData.get("email"));
    });
  }

  return (
    <section
      id="email"
      className="scroll-mt-6 bg-surface border border-line rounded-[16px] lg:rounded-[20px] px-[15px] lg:px-[18px] py-[13px] lg:py-[18px]"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-display font-semibold text-[15px]">Email reminders</h2>
        {email && !editing && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Send me reminder emails for this trip"
            onClick={toggle}
            className={`w-[38px] h-[22px] shrink-0 rounded-full flex items-center p-0.5 cursor-pointer ${
              on ? "bg-accent" : "bg-line"
            }`}
          >
            <span
              className={`w-[18px] h-[18px] rounded-full transition-transform duration-200 ease-out ${
                on ? "bg-accent-ink translate-x-4" : "bg-surface translate-x-0"
              }`}
            />
          </button>
        )}
      </div>

      {email && !editing ? (
        <>
          <p className="text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3">
            {on ? (
              <>
                Voting nudges, the calendar invite and payment reminders go to{" "}
                <span className="font-semibold text-ink break-all">{email}</span>.
              </>
            ) : (
              <>
                Paused — you won&rsquo;t get reminder emails for this trip.{" "}
                <span className="font-semibold text-ink break-all">{email}</span> stays saved.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="border border-line rounded-full px-[13px] py-[7px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent"
            >
              Change
            </button>
            <form action={save}>
              <input type="hidden" name="email" value="" />
              <button
                type="submit"
                disabled={pending}
                className="border border-line rounded-full px-[13px] py-[7px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent disabled:opacity-45"
              >
                {pending ? "Removing…" : "Remove"}
              </button>
            </form>
          </div>
        </>
      ) : (
        <form action={save}>
          <label
            htmlFor="member-email"
            className="block text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3"
          >
            Optional. Add one to get voting nudges, the calendar invite when dates lock, and payment
            reminders.
          </label>
          <div className="flex gap-2">
            <input
              id="member-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              defaultValue={email ?? ""}
              maxLength={254}
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-bg border border-line focus:border-accent rounded-[12px] px-3 py-2.5 text-[14px] outline-none placeholder:text-ink2/60"
            />
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 bg-accent text-accent-ink rounded-[12px] px-4 font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-45"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
          {email && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setEditing(false);
              }}
              className="mt-2 font-semibold text-[11px] text-ink2 cursor-pointer hover:text-ink"
            >
              Cancel
            </button>
          )}
        </form>
      )}

      {error && <p className="text-[12px] text-warn mt-2">{error}</p>}
    </section>
  );
}

/** Shown on the dashboard to the viewer only, until they've added an email. */
export function EmailNudge({ slug, className = "" }: { slug: string; className?: string }) {
  return (
    <Link
      href={`/trip/${slug}/updates#email`}
      className={`flex items-center justify-between gap-3 bg-accent-soft rounded-[16px] px-[15px] py-3 hover:opacity-90 ${className}`}
    >
      <span className="text-[12px] leading-[1.45] text-ink">
        <span className="font-semibold">Get reminders by email</span>
        <span className="text-ink2"> · the calendar invite too</span>
      </span>
      <span className="shrink-0 font-semibold text-[12px] text-accent">Add email</span>
    </Link>
  );
}
