const TONES = ["accent", "ok", "warn", "neutral"] as const;

/** "Maya Rivera" → "MR", "Maya" → "MA". */
export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar colours cycle so a group stays visually distinguishable. */
export const toneForIndex = (index: number) => TONES[index % TONES.length];
