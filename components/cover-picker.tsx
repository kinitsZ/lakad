"use client";

import Image from "next/image";
import { useState } from "react";
import { generateCover } from "@/lib/cover";
import { photoFor } from "@/lib/images";

const CHOICES = [
  { key: "caboCover", label: "Coast" },
  { key: "caboArch", label: "Arch" },
  { key: "tulum", label: "Tulum" },
  { key: "lisbon", label: "Lisbon" },
  { key: "hero", label: "Sunset" },
] as const;

/**
 * Cover is optional. With nothing chosen the trip gets a banner generated from
 * its name, previewed live here so it never feels like a missing image.
 */
export function CoverPicker({ tripName }: { tripName: string }) {
  const [chosen, setChosen] = useState<string>("");
  const name = tripName.trim() || "Your trip";
  const cover = generateCover(name);
  const selected = CHOICES.find((c) => c.key === chosen);
  const photo = selected ? photoFor(selected.key) : null;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-semibold text-[12px] text-ink2">Cover image</span>
        <span className="text-[11px] text-ink2">Optional</span>
      </div>

      <input type="hidden" name="coverKey" value={chosen} />

      <div className="h-[152px] lg:h-[200px] rounded-[18px] lg:rounded-[20px] overflow-hidden relative isolate border border-line">
        {photo ? (
          <Image
            src={photo.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, 100vw"
            className="object-cover"
            style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-end"
            style={{
              background: `linear-gradient(115deg, ${cover.from} 0%, ${cover.to} 100%)`,
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1200 300"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              {cover.circles.map((circle, i) => (
                <circle
                  key={i}
                  cx={circle.cx}
                  cy={circle.cy}
                  r={circle.r}
                  fill="#ffffff"
                  fillOpacity={circle.opacity}
                />
              ))}
            </svg>
            <div className="relative px-5 pb-4 font-display font-semibold text-white/95 text-[24px] leading-[1.05] tracking-[-0.03em] drop-shadow-[0_2px_14px_rgba(0,0,0,0.28)] line-clamp-2">
              {name}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={() => setChosen("")}
          aria-pressed={!chosen}
          className={`shrink-0 rounded-xl px-3 py-2 font-semibold text-[12px] cursor-pointer ${
            !chosen
              ? "bg-accent text-accent-ink"
              : "bg-surface border border-line text-ink2 hover:border-accent"
          }`}
        >
          Generated
        </button>
        {CHOICES.map((choice) => (
          <button
            key={choice.key}
            type="button"
            onClick={() => setChosen(choice.key)}
            aria-pressed={chosen === choice.key}
            className={`shrink-0 rounded-xl overflow-hidden border-2 w-[54px] h-[36px] relative cursor-pointer ${
              chosen === choice.key ? "border-accent" : "border-line hover:border-accent"
            }`}
            title={choice.label}
          >
            <Image
              src={photoFor(choice.key)!.src}
              alt={choice.label}
              fill
              sizes="54px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <p className="text-[12px] leading-[1.45] text-ink2 mt-2">
        Leave it on Generated and your trip gets its own banner, made from its name.
      </p>
    </div>
  );
}
