import { HttpException, HttpStatus } from "@nestjs/common";

const buckets = new Map<string, number[]>();

let lastSweep = 0;

export function assertRate(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [bucket, times] of buckets) if (times.every((time) => now - time > 60 * 60 * 1000)) buckets.delete(bucket);
  }
  const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (hits.length >= limit) {
    throw new HttpException("چند لحظه بعد دوباره تلاش کنید", HttpStatus.TOO_MANY_REQUESTS);
  }
  hits.push(now);
  buckets.set(key, hits);
}
