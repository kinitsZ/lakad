"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createTrip } from "@/app/actions/trips";
import { BrandBar } from "@/components/brand-bar";
import { CoverPicker } from "@/components/cover-picker";

const TIMEFRAMES = [
  { key: "weekend", label: "A weekend" },
  { key: "week", label: "A week" },
  { key: "flexible", label: "Flexible" },
] as const;

/** Default the vote to next month and the deadline to a week out. */
function defaults() {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  deadline.setHours(20, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    month: `${month.getUTCFullYear()}-${pad(month.getUTCMonth() + 1)}`,
    deadline: `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(
      deadline.getDate(),
    )}T20:00`,
    monthLabel: month.toLocaleString("en-GB", { month: "long", timeZone: "UTC" }),
  };
}

export default function CreateTripPage() {
  const initial = defaults();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [organiser, setOrganiser] = useState("");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]["key"]>("weekend");
  const [month, setMonth] = useState(initial.month);

  const ready = name.trim().length > 0 && organiser.trim().length > 0;
  const monthName = new Date(`${month}-01T00:00:00Z`).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <>
      <BrandBar />
      <div className="mx-auto w-full max-w-[430px] lg:max-w-[1040px] lg:px-6 lg:py-10">
        <header className="flex items-center justify-between px-5 lg:px-0 pt-2.5 lg:pt-0 pb-4 lg:pb-8">
          <Link
            href="/"
            className="text-[14px] font-medium text-ink2 hover:text-ink lg:order-2"
          >
            Cancel
          </Link>
          <h1 className="font-display font-semibold text-[15px] lg:text-[32px] lg:tracking-[-0.025em] lg:order-1 lg:mr-auto">
            New trip
          </h1>
          <div className="w-10 lg:hidden" aria-hidden />
        </header>

        <form
          className="px-5 lg:px-0 pb-8 lg:pb-0 flex flex-col gap-[18px] lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-10 lg:gap-y-6 lg:items-start"
          action={(formData) =>
            start(async () => {
              setError(null);
              formData.set("votingMonth", `${month}-01`);
              formData.set("timeframeLabel", `Sometime in ${monthName}`);
              const result = await createTrip(formData);
              if (result?.error) setError(result.error);
            })
          }
        >
          <div className="lg:col-start-1 lg:row-start-1 flex flex-col gap-[18px]">
            <div>
              <label htmlFor="trip-name" className="block font-semibold text-[12px] text-ink2 mb-2">
                Trip name
              </label>
              <input
                id="trip-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Our next trip"
                maxLength={80}
                className="w-full bg-surface border border-line rounded-[16px] px-4 py-[15px] lg:py-[18px] font-semibold text-[17px] lg:text-[20px] outline-none focus:border-accent"
              />
            </div>

            <div>
              <label
                htmlFor="organiser-name"
                className="block font-semibold text-[12px] text-ink2 mb-2"
              >
                Your name
              </label>
              <input
                id="organiser-name"
                name="organiserName"
                value={organiser}
                onChange={(e) => setOrganiser(e.target.value)}
                placeholder="Your first name"
                maxLength={60}
                className="w-full bg-surface border border-line rounded-[16px] px-4 py-[15px] font-medium text-[16px] outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3">
            <CoverPicker tripName={name} />
            <p className="hidden lg:flex gap-[9px] bg-accent-soft rounded-[14px] px-3.5 py-3 mt-4">
              <span className="w-2 h-2 shrink-0 rounded-full bg-accent mt-[5px]" />
              <span className="text-[12px] leading-[1.45] text-ink">
                We&rsquo;ll nudge anyone who hasn&rsquo;t voted 24 hours before, then lock the
                winning dates automatically.
              </span>
            </p>
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <span className="block font-semibold text-[12px] text-ink2 mb-2">
              Rough timeframe
            </span>
            <input type="hidden" name="timeframeKind" value={timeframe} />
            <div className="flex gap-2 mb-2.5">
              {TIMEFRAMES.map((option) => {
                const selected = option.key === timeframe;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTimeframe(option.key)}
                    className={`flex-1 rounded-[13px] py-[11px] lg:py-3.5 text-center font-semibold text-[13px] cursor-pointer ${
                      selected
                        ? "bg-accent text-accent-ink"
                        : "bg-surface border border-line text-ink2 hover:border-accent"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <label className="bg-surface border border-line rounded-[16px] px-4 py-3.5 flex items-center justify-between gap-3">
              <span className="font-medium text-[15px]">Vote over</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-[15px] text-ink2 outline-none"
              />
            </label>
          </div>

          <div className="lg:col-start-1 lg:row-start-3">
            <label
              htmlFor="deadline"
              className="block font-semibold text-[12px] text-ink2 mb-2"
            >
              Voting deadline
            </label>
            <div className="bg-surface border border-line rounded-[16px] px-4 py-3.5 flex items-center justify-between mb-2 gap-3">
              <input
                id="deadline"
                name="votingDeadline"
                type="datetime-local"
                defaultValue={initial.deadline}
                required
                className="w-full bg-transparent font-medium text-[15px] outline-none"
              />
            </div>
            <p className="flex lg:hidden gap-[9px] bg-accent-soft rounded-[14px] px-3.5 py-3">
              <span className="w-2 h-2 shrink-0 rounded-full bg-accent mt-[5px]" />
              <span className="text-[12px] leading-[1.45] text-ink">
                We&rsquo;ll nudge anyone who hasn&rsquo;t voted 24 hours before, then lock the
                winning dates automatically.
              </span>
            </p>
          </div>

          {error && (
            <p className="lg:col-start-1 lg:row-start-4 text-[13px] text-warn">{error}</p>
          )}

          <button
            type="submit"
            disabled={!ready || pending}
            className="bg-accent text-accent-ink rounded-[16px] p-4 lg:px-10 text-center font-semibold text-[16px] mt-0.5 lg:mt-0 cursor-pointer hover:opacity-90 disabled:opacity-45 lg:col-start-1 lg:row-start-5 lg:justify-self-start"
          >
            {pending ? "Creating…" : "Create trip & get link"}
          </button>
        </form>
      </div>
    </>
  );
}
