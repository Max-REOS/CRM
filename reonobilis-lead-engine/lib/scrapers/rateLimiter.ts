const lastRequestByHost = new Map<string, number>();

const MIN_INTERVAL_MS = 1000; // max. 1 request/second/host, per legal brief section 8

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits as needed so we never issue more than one request per second to the same host. */
export async function throttle(url: string): Promise<void> {
  const host = new URL(url).host;
  const last = lastRequestByHost.get(host) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestByHost.set(host, Date.now());
}
