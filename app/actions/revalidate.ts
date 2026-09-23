import { revalidatePath } from "next/cache";

/**
 * Call after any write. Visited trip tabs are kept in the browser for a while
 * (`staleTimes` in next.config.ts); plain `refresh()` would only update the current
 * one, leaving e.g. the dashboard total stale. This drops them all.
 */
export function refreshTrip() {
  revalidatePath("/trip/[slug]", "layout");
}
