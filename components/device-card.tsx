"use client";

import { useEffect, useState, useTransition } from "react";
import { createDeviceLink } from "@/app/actions/devices";

type Issued = Awaited<ReturnType<typeof createDeviceLink>>;

export function DeviceCard({ tripId }: { tripId: string }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<Issued | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!link) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [link]);

  const secondsLeft = link
    ? Math.max(0, Math.round((new Date(link.expiresAt).getTime() - now) / 1000))
    : 0;
  const expired = Boolean(link) && secondsLeft === 0;

  function issue() {
    start(async () => {
      setCopied(false);
      const next = await createDeviceLink(tripId);
      setNow(Date.now());
      setLink(next);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignored — the link is still visible to copy by hand
    }
  }

  const button =
    "border border-line rounded-full px-[13px] py-[7px] font-semibold text-[11px] text-ink2 cursor-pointer hover:border-accent disabled:opacity-45";

  return (
    <section className="bg-surface border border-line rounded-[16px] lg:rounded-[20px] px-[15px] lg:px-[18px] py-[13px] lg:py-[18px]">
      <h2 className="font-display font-semibold text-[15px] mb-1">Use on another device</h2>

      {!link || expired ? (
        <>
          <p className="text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3">
            {expired
              ? "That link expired. Make a new one when your other device is ready."
              : "Get a one-time link or QR code that signs your phone or laptop in as you."}
          </p>
          <button
            type="button"
            onClick={issue}
            disabled={pending}
            className="bg-accent text-accent-ink rounded-[12px] px-4 py-2.5 font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-45"
          >
            {pending ? "Making link…" : expired ? "Make a new link" : "Show QR code"}
          </button>
        </>
      ) : (
        <>
          <p className="text-[12px] lg:text-[13px] leading-[1.5] text-ink2 mb-3">
            Scan with your other device, or send yourself the link. It works once, for{" "}
            <span className="font-semibold text-ink tabular-nums">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
            . Only share it with yourself — it signs in as you.
          </p>
          {/* QR codes need dark-on-light to scan, whatever the theme. */}
          <div className="bg-white rounded-[14px] p-2 w-[168px] mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URI */}
            <img src={link.qr} alt="QR code for your device link" width={152} height={152} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copy} className={button}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            <button type="button" onClick={issue} disabled={pending} className={button}>
              New link
            </button>
          </div>
        </>
      )}
    </section>
  );
}
