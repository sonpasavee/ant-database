const REQUEST_INTERVAL_MS = 1_100;
let nextRequestAt = 0;

// Share a single polite request schedule between forward and reverse lookups
// within the running application instance.
export async function waitForNominatimSlot() {
  const now = Date.now();
  const requestAt = Math.max(now, nextRequestAt);
  nextRequestAt = requestAt + REQUEST_INTERVAL_MS;
  const delay = requestAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}
