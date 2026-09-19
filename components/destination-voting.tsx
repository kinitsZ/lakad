"use client";

import { useMemo, useState, useTransition } from "react";
import { suggestDestination, toggleDestinationVote } from "@/app/actions/voting";
import { AvatarStack, Cover, PhotoPlaceholder } from "@/components/ui";
import type { DestinationView, MemberView } from "@/db/queries";
import { photoFor } from "@/lib/images";
import { money } from "@/lib/money";

const UPVOTES = 2;

export function DestinationVoting({
  tripId,
  destinations,
  members,
  currentMemberId,
  closesIn,
}: {
  tripId: string;
  destinations: DestinationView[];
  members: MemberView[];
  currentMemberId: string;
  closesIn: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const ranked = useMemo(
    () => [...destinations].sort((a, b) => b.voterIds.length - a.voterIds.length),
    [destinations],
  );
  const used = destinations.filter((d) => d.voterIds.includes(currentMemberId)).length;
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  function vote(destinationId: string) {
    setError(null);
    start(async () => {
      const result = await toggleDestinationVote(tripId, destinationId);
      if (result?.error) setError(result.error);
    });
  }

  const [leading, ...rest] = ranked;

  return (
    <div className="mx-auto w-full max-w-[430px] lg:max-w-[1280px] lg:px-6 lg:py-8">
      <header className="flex items-center justify-between px-5 lg:px-0 pt-3 lg:pt-0 pb-2.5 lg:pb-6">
        <h1 className="font-display font-semibold text-[19px] lg:text-[32px] lg:tracking-[-0.025em]">
          Where to?
        </h1>
        <button
          type="button"
          onClick={() => setSuggesting((v) => !v)}
          className="font-semibold text-[12px] text-accent cursor-pointer lg:border lg:border-line lg:rounded-full lg:px-4 lg:py-2 lg:hover:border-accent"
        >
          {suggesting ? "Cancel" : "Suggest a place"}
        </button>
      </header>

      <div className="px-5 lg:px-0 pb-8 lg:pb-0 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-ink2 lg:hidden">
            Everyone gets {UPVOTES} upvotes · closes in {closesIn}
            {used > 0 && ` · you've used ${used} of ${UPVOTES}`}
          </p>

          {suggesting && (
            <SuggestForm
              tripId={tripId}
              onDone={() => setSuggesting(false)}
              onError={setError}
            />
          )}

          {error && (
            <p className="bg-warn-soft text-ink rounded-[14px] px-3.5 py-3 text-[12px]">
              {error}
            </p>
          )}

          {!destinations.length ? (
            <DestinationsEmptyState onSuggest={() => setSuggesting(true)} />
          ) : (
            <>
              <LeadingCard
                destination={leading}
                voters={leading.voterIds.map((id) => byId.get(id)).filter(Boolean) as MemberView[]}
                mine={leading.voterIds.includes(currentMemberId)}
                disabled={pending || (used >= UPVOTES && !leading.voterIds.includes(currentMemberId))}
                onToggle={() => vote(leading.id)}
              />
              {rest.length > 0 && (
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
                  {rest.map((destination) => (
                    <CompactCard
                      key={destination.id}
                      destination={destination}
                      mine={destination.voterIds.includes(currentMemberId)}
                      disabled={
                        pending ||
                        (used >= UPVOTES && !destination.voterIds.includes(currentMemberId))
                      }
                      onToggle={() => vote(destination.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {destinations.length > 0 && (
          <ResultsPanel ranked={ranked} used={used} closesIn={closesIn} />
        )}
      </div>
    </div>
  );
}

function SuggestForm({
  tripId,
  onDone,
  onError,
}: {
  tripId: string;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="bg-surface border border-line rounded-[18px] p-4 flex flex-col gap-3"
      action={(formData) =>
        start(async () => {
          onError(null);
          const result = await suggestDestination(tripId, formData);
          if (result?.error) onError(result.error);
          else onDone();
        })
      }
    >
      <Field label="Place" name="name" placeholder="Somewhere you'd go" required />
      <div className="flex gap-3">
        <Field label="Cost pp" name="costPerPerson" placeholder="600" type="number" />
        <Field label="Travel" name="travel" placeholder="5h flight" />
      </div>
      <Field label="Why?" name="note" placeholder="Why there?" />
      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-accent-ink rounded-[13px] px-4 py-2.5 font-semibold text-[13px] cursor-pointer hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add this place"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex-1 block">
      <span className="block font-semibold text-[11px] text-ink2 mb-1.5">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent"
      />
    </label>
  );
}

function VoteButton({
  count,
  mine,
  disabled,
  onToggle,
  size = "lg",
  name,
}: {
  count: number;
  mine: boolean;
  disabled: boolean;
  onToggle: () => void;
  size?: "lg" | "sm";
  name: string;
}) {
  const large = size === "lg";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={mine}
      aria-label={`Upvote ${name}`}
      title={disabled && !mine ? "You've used both upvotes" : undefined}
      className={`shrink-0 flex flex-col items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        large ? "gap-0.5 rounded-[14px] px-3 py-2" : "gap-px rounded-xl px-2.5 py-1.5"
      } ${mine ? "bg-accent text-accent-ink" : "border border-line text-ink hover:border-accent"}`}
    >
      <span
        className={`font-semibold ${large ? "text-[11px]" : "text-[10px]"} ${mine ? "" : "text-ink2"}`}
        aria-hidden
      >
        ▲
      </span>
      <span className={`font-bold ${large ? "text-[14px]" : "text-[13px]"}`}>{count}</span>
    </button>
  );
}

function LeadingCard({
  destination,
  voters,
  mine,
  disabled,
  onToggle,
}: {
  destination: DestinationView;
  voters: MemberView[];
  mine: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const photo = photoFor(destination.photoKey);
  const band = "h-[100px] lg:h-[200px] flex items-start justify-end p-3 lg:p-4";

  return (
    <article className="bg-surface border-[1.5px] border-accent rounded-[20px] overflow-hidden">
      {photo ? (
        <Cover photo={photo} sizes="(min-width: 1024px) 62vw, 100vw" className={band}>
          <LeadingBadge />
        </Cover>
      ) : (
        <PhotoPlaceholder className={band}>
          <LeadingBadge />
        </PhotoPlaceholder>
      )}
      <div className="px-[15px] py-[13px]">
        <div className="flex justify-between items-start gap-3 mb-1.5">
          <div>
            <h2 className="font-display font-semibold text-[18px]">{destination.name}</h2>
            <p className="text-[12px] text-ink2">
              {[destination.costPerPerson ? `≈ ${money(destination.costPerPerson * 100)} pp` : null,
                destination.travel || null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <VoteButton
            count={destination.voterIds.length}
            mine={mine}
            disabled={disabled}
            onToggle={onToggle}
            name={destination.name}
          />
        </div>
        {destination.note && (
          <p className="text-[12px] leading-[1.4] text-ink2 mb-[9px]">
            &ldquo;{destination.note}&rdquo;
            {destination.suggestedByName && ` — ${destination.suggestedByName.split(" ")[0]}`}
          </p>
        )}
        <AvatarStack members={voters} size={24} />
      </div>
    </article>
  );
}

const LeadingBadge = () => (
  <span className="bg-accent text-accent-ink rounded-full px-2.5 py-[5px] font-semibold text-[10px]">
    Leading
  </span>
);

function CompactCard({
  destination,
  mine,
  disabled,
  onToggle,
}: {
  destination: DestinationView;
  mine: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const photo = photoFor(destination.photoKey);
  const panel = "w-[104px] lg:w-[150px] shrink-0";

  return (
    <article className="bg-surface border border-line rounded-[20px] overflow-hidden flex">
      {photo ? (
        <Cover photo={photo} sizes="(min-width: 1024px) 150px, 104px" className={panel} />
      ) : (
        <PhotoPlaceholder className={`${panel} grid place-items-center`}>
          <span className="font-mono text-[9px] text-ink2 text-center p-1.5">no photo yet</span>
        </PhotoPlaceholder>
      )}
      <div className="px-3.5 py-[13px] flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3 mb-[5px]">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-[16px] truncate">
              {destination.name}
            </h2>
            <p className="text-[12px] text-ink2">
              {[destination.costPerPerson ? `≈ ${money(destination.costPerPerson * 100)} pp` : null,
                destination.travel || null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <VoteButton
            count={destination.voterIds.length}
            mine={mine}
            disabled={disabled}
            onToggle={onToggle}
            size="sm"
            name={destination.name}
          />
        </div>
        {destination.note && (
          <p className="text-[11px] leading-[1.4] text-ink2">
            &ldquo;{destination.note}&rdquo;
            {destination.suggestedByName && ` — ${destination.suggestedByName.split(" ")[0]}`}
          </p>
        )}
      </div>
    </article>
  );
}

function ResultsPanel({
  ranked,
  used,
  closesIn,
}: {
  ranked: DestinationView[];
  used: number;
  closesIn: string;
}) {
  const total = ranked.reduce((sum, d) => sum + d.voterIds.length, 0) || 1;
  const barClass = ["bg-accent", "bg-h2", "bg-h1"];

  return (
    <aside className="hidden lg:flex flex-col gap-3.5 bg-surface border border-line rounded-[20px] p-[18px]">
      <h2 className="font-display font-semibold text-[15px]">Standings</h2>
      <div className="flex flex-col gap-[7px]">
        {ranked.map((destination, i) => (
          <div key={destination.id} className="flex items-center gap-[9px]">
            <div className="font-medium text-[12px] w-[70px] truncate">
              {destination.name.split(" ")[0]}
            </div>
            <div className="flex-1 h-2 rounded-[5px] bg-surface2 overflow-hidden">
              <div
                className={`h-full ${barClass[i] ?? "bg-h1"}`}
                style={{ width: `${(destination.voterIds.length / total) * 100}%` }}
              />
            </div>
            <div className="font-semibold text-[12px] w-3 text-right">
              {destination.voterIds.length}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink2">Your upvotes</span>
          <span className="font-semibold text-[12px]">
            {used} of {UPVOTES} used
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: UPVOTES }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < used ? "bg-accent" : "bg-surface2"}`}
            />
          ))}
        </div>
        <p className="text-[12px] leading-[1.45] text-ink2 mt-1">
          Voting closes in {closesIn}. The leading place locks in automatically unless the
          organiser picks another.
        </p>
      </div>
    </aside>
  );
}

export function DestinationsEmptyState({ onSuggest }: { onSuggest: () => void }) {
  return (
    <div className="border border-dashed border-line rounded-[20px] px-4 py-3.5 text-center bg-surface">
      <div className="w-8 h-8 rounded-[11px] bg-accent-soft mx-auto mb-[9px]" />
      <h2 className="font-display font-semibold text-[15px] mb-1">No votes yet</h2>
      <p className="text-[12px] leading-[1.4] text-ink2 mb-[11px]">
        Be the first to upvote — or add a place you&rsquo;ve been dying to go.
      </p>
      <button
        type="button"
        onClick={onSuggest}
        className="inline-block bg-accent text-accent-ink rounded-[13px] px-4 py-2.5 font-semibold text-[13px] cursor-pointer hover:opacity-90"
      >
        Suggest a destination
      </button>
    </div>
  );
}
