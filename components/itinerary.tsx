"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addActivity } from "@/app/actions/itinerary";
import { Avatar } from "@/components/ui";
import type { ActivityView, MemberView } from "@/db/queries";
import { fullDay, rangeLabel, shortDay, timeLabel, weekday } from "@/lib/format";

export function Itinerary({
  tripId,
  days,
  activities,
  members,
  locked,
}: {
  tripId: string;
  days: string[];
  activities: ActivityView[];
  members: MemberView[];
  locked: boolean;
}) {
  const [activeDate, setActiveDate] = useState(days[0]);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const sections = useRef(new Map<string, HTMLElement>());
  const byId = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target instanceof HTMLElement && visible.target.dataset.date) {
          setActiveDate(visible.target.dataset.date);
        }
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const section of sections.current.values()) observer.observe(section);
    return () => observer.disconnect();
  }, [days.length]);

  if (!days.length) {
    return (
      <div className="mx-auto w-full max-w-[430px] lg:max-w-[760px] px-5 lg:px-6 py-10 text-center">
        <h1 className="font-display font-semibold text-[22px] mb-2">No dates yet</h1>
        <p className="text-[14px] text-ink2">
          Once the group votes on dates, the itinerary opens up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] lg:px-6 lg:py-8">
      <header className="px-5 lg:px-0 pt-3 lg:pt-0 pb-2.5 lg:pb-6 sticky lg:static top-0 bg-bg z-[1]">
        <div className="flex items-center justify-between mb-2.5 lg:mb-0 gap-3">
          <h1 className="font-display font-semibold text-[19px] lg:text-[32px] lg:tracking-[-0.025em]">
            Itinerary
          </h1>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] font-semibold text-[10px] ${
              locked ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"
            }`}
          >
            {locked ? "Dates locked" : "Leading"} · {rangeLabel(days[0], days[days.length - 1])}
          </div>
        </div>
        <div className="flex gap-[7px] overflow-x-auto lg:hidden">
          {days.map((day) => (
            <a
              key={day}
              href={`#day-${day}`}
              aria-current={day === activeDate ? "true" : undefined}
              className={`shrink-0 rounded-xl px-[13px] py-2 font-semibold text-[12px] ${
                day === activeDate
                  ? "bg-accent text-accent-ink"
                  : "bg-surface border border-line text-ink2 hover:border-accent"
              }`}
            >
              {shortDay(day)}
            </a>
          ))}
        </div>
      </header>

      <div className="px-5 lg:px-0 pb-8 lg:pb-0 flex flex-col gap-3.5 lg:grid lg:grid-cols-4 lg:gap-5 lg:items-start">
        {days.map((day, i) => {
          const dayActivities = activities.filter((a) => a.day === day);
          return (
            <section
              key={day}
              id={`day-${day}`}
              data-date={day}
              ref={(node) => {
                if (node) sections.current.set(day, node);
                else sections.current.delete(day);
              }}
              className={`scroll-mt-[112px] lg:bg-surface lg:border lg:border-line lg:rounded-[20px] lg:p-4 ${
                i > 0 ? "border-t border-line pt-3.5 lg:border-t lg:pt-4" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2.5 gap-2">
                <h2 className="font-semibold text-[14px] lg:hidden">{fullDay(day)}</h2>
                <h2 className="hidden lg:block font-display font-semibold text-[15px]">
                  {shortDay(day)}
                </h2>
                <div className="text-[12px] text-ink2 shrink-0">
                  {dayActivities.length
                    ? `${dayActivities.length} ${
                        dayActivities.length === 1 ? "activity" : "activities"
                      }`
                    : "Nothing planned"}
                </div>
              </div>

              {dayActivities.length ? (
                <div className="flex flex-col gap-[9px] stagger-children">
                  {dayActivities.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      author={byId.get(activity.addedById ?? "")}
                    />
                  ))}
                  {openForm === day ? (
                    <AddActivityForm
                      tripId={tripId}
                      day={day}
                      onDone={() => setOpenForm(null)}
                    />
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-14 shrink-0 lg:hidden" />
                      <button
                        type="button"
                        onClick={() => setOpenForm(day)}
                        className="flex-1 border border-dashed border-line rounded-[16px] p-[13px] flex items-center justify-center gap-2 cursor-pointer text-accent font-semibold text-[13px] hover:border-accent"
                      >
                        <span className="text-[15px]">+</span> Add activity to {weekday(day)}
                      </button>
                    </div>
                  )}
                </div>
              ) : openForm === day ? (
                <AddActivityForm tripId={tripId} day={day} onDone={() => setOpenForm(null)} />
              ) : (
                <div className="border border-dashed border-line rounded-[18px] px-4 py-5 text-center bg-surface">
                  <h3 className="font-display font-semibold text-[14px] mb-1">Day wide open</h3>
                  <p className="text-[12px] leading-[1.45] text-ink2 mb-3">
                    Nothing planned for {weekday(day)} yet.
                  </p>
                  <div className="flex lg:flex-col gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setOpenForm(day)}
                      className="bg-accent text-accent-ink rounded-xl px-3.5 py-2.5 font-semibold text-[12px] cursor-pointer hover:opacity-90"
                    >
                      + Add activity
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AddActivityForm({
  tripId,
  day,
  onDone,
}: {
  tripId: string;
  day: string;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="bg-surface border border-line rounded-[16px] p-3.5 flex flex-col gap-2.5"
      action={(formData) =>
        start(async () => {
          setError(null);
          const result = await addActivity(tripId, formData);
          if (result?.error) setError(result.error);
          else onDone();
        })
      }
    >
      <input type="hidden" name="day" value={day} />
      <div className="flex gap-2.5">
        <label className="w-[110px] shrink-0">
          <span className="block font-semibold text-[11px] text-ink2 mb-1.5">Time</span>
          <input
            name="startTime"
            type="time"
            required
            defaultValue="12:00"
            className="w-full bg-bg border border-line rounded-xl px-2.5 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>
        <label className="flex-1 min-w-0">
          <span className="block font-semibold text-[11px] text-ink2 mb-1.5">What</span>
          <input
            name="title"
            required
            placeholder="Dinner, a hike, a booking…"
            className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>
      </div>
      <label>
        <span className="block font-semibold text-[11px] text-ink2 mb-1.5">Where</span>
        <input
          name="place"
          placeholder="Address, or a note for everyone"
          className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-[12px] text-warn">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-ink rounded-xl px-3.5 py-2 font-semibold text-[12px] cursor-pointer hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border border-line rounded-xl px-3.5 py-2 font-semibold text-[12px] text-ink2 cursor-pointer hover:border-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ActivityRow({
  activity,
  author,
}: {
  activity: ActivityView;
  author?: MemberView;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-14 shrink-0 text-right font-semibold text-[12px] text-ink2 pt-3.5 lg:hidden">
        {timeLabel(activity.startTime)}
      </div>
      <div
        className={`flex-1 min-w-0 rounded-[16px] px-3.5 py-3 ${
          activity.highlight ? "bg-accent-soft" : "bg-surface border border-line"
        }`}
      >
        <div className="hidden lg:block font-semibold text-[11px] text-ink2 mb-1">
          {timeLabel(activity.startTime)}
        </div>
        <div className="font-semibold text-[14px] mb-[3px]">{activity.title}</div>
        {activity.place && (
          <div className="text-[12px] text-ink2 mb-2">{activity.place}</div>
        )}
        {author && (
          <div className="flex items-center gap-1.5">
            <Avatar member={author} size={20} />
            <div className="text-[11px] text-ink2">
              {author.name.split(" ")[0]} added this
              {activity.meta ? ` · ${activity.meta}` : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
