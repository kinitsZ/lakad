import { addDays } from "@/lib/format";

/** An all-day event over the trip's dates (DTEND is exclusive in iCalendar). */
export function icsFile(event: { uid: string; title: string; start: string; end: string; url: string }) {
  const text = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const day = (iso: string) => iso.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lakad//Trips//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(event.start)}`,
    `DTEND;VALUE=DATE:${day(addDays(event.end, 1))}`,
    `SUMMARY:${text(event.title)}`,
    `URL:${event.url}`,
    "DESCRIPTION:Planned with Lakad",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
