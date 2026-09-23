/**
 * A trip with no photo gets a generated banner instead. Everything here is
 * derived from the trip's slug, so the same trip always looks the same.
 */

const PALETTES = [
  { from: "#cd632d", to: "#8a3a16" }, // terracotta — the brand accent
  { from: "#d9873a", to: "#94501a" }, // amber
  { from: "#a44a52", to: "#642a36" }, // rose clay
  { from: "#7b5ea7", to: "#463367" }, // plum
  { from: "#3f7d6e", to: "#1f4a41" }, // sea
  { from: "#4a6da8", to: "#27406b" }, // dusk
  { from: "#6b7f3f", to: "#3c4a23" }, // olive
];

/** FNV-1a — small, fast, and stable across runs. */
function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GeneratedCover = {
  from: string;
  to: string;
  /** Overlapping discs; where they cross, the translucent white compounds
   *  into the same lens the Lakad mark is built from. */
  circles: { cx: number; cy: number; r: number; opacity: number }[];
};

export function generateCover(seed: string): GeneratedCover {
  const h = hash(seed);
  const random = seeded(h);
  const palette = PALETTES[h % PALETTES.length];

  // Three deliberate pairs spread across the banner. Each pair overlaps, so
  // the translucent white compounds into the mark's lens shape.
  const circles = [0, 1, 2].flatMap((pair) => {
    const anchorX = 170 + pair * 420 + random() * 140;
    const anchorY = 60 + random() * 180;
    const radius = 110 + random() * 80;
    const spread = radius * (0.85 + random() * 0.35);
    return [
      { cx: anchorX, cy: anchorY, r: radius, opacity: 0.11 },
      { cx: anchorX + spread, cy: anchorY + (random() - 0.5) * 90, r: radius, opacity: 0.11 },
    ];
  });

  return { from: palette.from, to: palette.to, circles };
}
