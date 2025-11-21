import { describe, expect, it } from "vitest";
import reducer, { getTokenBalancesBatch } from "./swapSlice";

const initState = reducer(undefined, { type: "init" }) as any;

describe("swapSlice token balance updates", () => {
  it("stores balances only for the matching request/account", () => {
    const pending = reducer(initState, {
      type: getTokenBalancesBatch.pending.type,
      meta: { requestId: "req-1", arg: { account: "0xabc", tokens: [] } },
    } as any);

    const fulfilled = reducer(pending, {
      type: getTokenBalancesBatch.fulfilled.type,
      payload: { balances: { "0x1": "10" }, account: "0xabc" },
      meta: { requestId: "req-1", arg: { account: "0xabc", tokens: [] } },
    } as any);

    expect(fulfilled.tokenBalances["0x1"]).toEqual("10");
    expect(fulfilled.isTokenBalancesLoading).toBe(false);

    const stale = reducer(fulfilled, {
      type: getTokenBalancesBatch.fulfilled.type,
      payload: { balances: { "0x2": "20" }, account: "0xdef" },
      meta: { requestId: "req-other", arg: { account: "0xdef", tokens: [] } },
    } as any);

    expect(stale.tokenBalances["0x2"]).toBeUndefined();
  });
});
