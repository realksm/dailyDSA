// Fixed-window, in-memory rate limiter. Fine for the single server process we run;
// limits reset on restart, which is acceptable for brute-force/abuse protection.
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = 0;

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Counts a hit; false once `key` has used up its `max` hits in the current window. */
  hit(key: string): boolean {
    const t = this.now();
    this.sweep(t);
    const e = this.hits.get(key);
    if (!e || e.resetAt <= t) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    e.count++;
    return e.count <= this.max;
  }

  /** True if the next hit would be refused (doesn't count). */
  blocked(key: string): boolean {
    const e = this.hits.get(key);
    return !!e && e.resetAt > this.now() && e.count >= this.max;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private sweep(t: number) {
    if (t - this.lastSweep < this.windowMs) return;
    this.lastSweep = t;
    for (const [k, e] of this.hits) if (e.resetAt <= t) this.hits.delete(k);
  }
}
