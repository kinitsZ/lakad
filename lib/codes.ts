import { randomBytes } from "node:crypto";

// 32 symbols, so each byte maps evenly (byte & 31). No 0/o/1/l to misread when typed.
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** `length` characters of secure randomness, 5 bits each. */
export function randomCode(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte & 31];
  return out;
}

/** "Cabo Reunion" → "cabo-reunion-7fk2m9qxwp". The suffix (50 bits) makes it unguessable. */
export function newTripSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "trip";
  return `${base}-${randomCode(10)}`;
}

/** The secret in /join/<code>: 60 bits, no trip name in it. */
export const newInviteCode = () => randomCode(12);
