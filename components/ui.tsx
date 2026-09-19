import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { MemberView } from "@/db/queries";
import type { Photo } from "@/lib/images";

type Tone = MemberView["tone"];

const toneClass: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-surface2 text-ink2",
};

const initialsSize: Record<number, number> = {
  20: 8, 22: 9, 24: 9, 26: 10, 28: 10, 30: 11, 32: 12, 34: 12, 42: 15,
};

export function Avatar({
  member,
  size = 30,
  ring,
  label,
  className = "",
  style,
}: {
  member?: Pick<MemberView, "name" | "initials" | "tone">;
  size?: number;
  /** Colour of the cut-out border used when avatars overlap in a stack. */
  ring?: "surface" | "bg";
  /** Overrides the initials, for the "+2" chip that closes a stack. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const tone: Tone = label ? "neutral" : (member?.tone ?? "neutral");

  return (
    <div
      className={`shrink-0 rounded-full grid place-items-center font-semibold ${toneClass[tone]} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: initialsSize[size] ?? Math.round(size * 0.36),
        ...(ring ? { border: `2px solid var(--${ring})` } : null),
        ...style,
      }}
      title={label ? undefined : member?.name}
    >
      {label ?? member?.initials}
    </div>
  );
}

export function AvatarStack({
  members,
  size = 30,
  ring = "surface",
  max,
}: {
  members: Pick<MemberView, "id" | "name" | "initials" | "tone">[];
  size?: number;
  ring?: "surface" | "bg";
  max?: number;
}) {
  const shown = max ? members.slice(0, max) : members;
  const overflow = max ? members.length - shown.length : 0;
  const overlap = { marginLeft: -Math.round(size * 0.3) };

  return (
    <div className="flex">
      {shown.map((member, i) => (
        <Avatar
          key={member.id}
          member={member}
          size={size}
          ring={ring}
          style={i === 0 ? undefined : overlap}
        />
      ))}
      {overflow > 0 && (
        <Avatar size={size} ring={ring} label={`+${overflow}`} style={overlap} />
      )}
    </div>
  );
}

/**
 * A photo filling its container, with the layout left to the container so
 * callers keep their own flex/grid. `isolate` + a negative z-index puts the
 * image behind the children without them needing to be positioned.
 */
export function Cover({
  photo,
  className = "",
  sizes = "100vw",
  priority = false,
  children,
}: {
  photo: Photo;
  className?: string;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`relative isolate overflow-hidden bg-surface2 ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        placeholder="blur"
        priority={priority}
        style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
        className="-z-10 object-cover"
      />
      {children}
    </div>
  );
}

/** Striped stand-in, still used where there is genuinely no image yet. */
export function PhotoPlaceholder({
  label,
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`photo-placeholder relative ${className}`}>
      {label && (
        <span className="absolute top-4 left-4 font-mono text-[11px] text-ink2">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-semibold text-[11px] tracking-[0.1em] uppercase text-ink2">
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-[18px] ${className}`}>
      {children}
    </div>
  );
}

/** The dark status banner used for countdowns. */
export function StatusBanner({
  title,
  detail,
  trailing,
  className = "",
}: {
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-ink text-bg rounded-[18px] px-4 py-3.5 flex items-center justify-between gap-4 ${className}`}
    >
      <div>
        <div className="font-semibold text-[13px] mb-[3px]">{title}</div>
        {detail && <div className="text-[12px] opacity-70">{detail}</div>}
      </div>
      {trailing}
    </div>
  );
}

export function PhasePill({ phase }: { phase: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-accent-soft text-accent rounded-full px-[11px] py-[5px] font-semibold text-[11px]">
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
      {phase}
    </div>
  );
}
