export type AcquireResult = { ok: true } | { ok: false; waitMs: number };

const KEY = "piteas_quote_timestamps_v1";
const CHANNEL = "piteas-quota-v1";

export class PiteasRateLimiter {
  private static inst: PiteasRateLimiter;
  private readonly perMinute: number;
  private readonly winMs: number = 60_000;
  private bc?: BroadcastChannel;

  private constructor(perMinute: number) {
    this.perMinute = perMinute;
    if ("BroadcastChannel" in window) {
      this.bc = new BroadcastChannel(CHANNEL);
      this.bc.onmessage = (e) => {
        if (e?.data?.type === "SYNC_TS") localStorage.setItem(KEY, e.data.payload);
      };
    }
  }

  static get(perMinute: number) {
    if (!this.inst) this.inst = new PiteasRateLimiter(perMinute);
    return this.inst;
  }

  private now() { return Date.now(); }

  private read(): number[] {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  private write(ts: number[]) {
    const s = JSON.stringify(ts);
    localStorage.setItem(KEY, s);
    this.bc?.postMessage({ type: "SYNC_TS", payload: s });
  }

  /** returns {ok:false, waitMs} when over limit */
  acquire(): AcquireResult {
    const now = this.now();
    const cutoff = now - this.winMs;
    const ts = this.read().filter(t => t >= cutoff);

    if (ts.length >= this.perMinute) {
      const earliest = ts[0];
      const waitMs = this.winMs - (now - earliest);
      return { ok: false, waitMs: Math.max(waitMs, 0) };
    }
    ts.push(now);
    this.write(ts);
    return { ok: true };
  }

  /** Optional helper for UI */
  nextAvailableMs(): number {
    const now = this.now(), cutoff = now - this.winMs;
    const ts = this.read().filter(t => t >= cutoff);
    if (ts.length < this.perMinute) return 0;
    const earliest = ts[0];
    return Math.max(this.winMs - (now - earliest), 0);
  }
}
