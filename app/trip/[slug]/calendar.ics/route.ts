import { getTripBySlug } from "@/db/queries";
import { icsFile } from "@/lib/calendar";

/**
 * The trip as a calendar file, linked from the "dates locked" email. Only the name
 * and dates are exposed, and only to someone who already has the unguessable slug.
 */
export async function GET(request: Request, { params }: RouteContext<"/trip/[slug]/calendar.ics">) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip?.lockedStart || !trip.lockedEnd) {
    return new Response("No dates are locked for this trip yet.", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const body = icsFile({
    uid: `${trip.id}@lakad`,
    title: trip.name,
    start: trip.lockedStart,
    end: trip.lockedEnd,
    url: `${origin}/trip/${trip.slug}`,
  });

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${trip.slug}.ics"`,
    },
  });
}
