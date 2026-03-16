import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchBridgeEstimate } from "../bridgeSlice";

describe("fetchBridgeEstimate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("always includes targetChainId in estimate query params", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          networkId: 1,
          amount: "3000000",
          estimatedAmount: "3000000",
          fee: "0",
          feePercentage: 0,
          isSupported: true,
        },
      }),
    }));

    vi.stubGlobal("fetch", mockFetch);

    const dispatch = vi.fn();
    const thunk = fetchBridgeEstimate({
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      networkId: 1,
      targetChainId: 369,
      amount: "3000000",
    });

    await (thunk as any)(dispatch, () => ({}), undefined);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const requestUrl = String(mockFetch.mock.calls[0][0]);
    const parsed = new URL(requestUrl);

    expect(parsed.pathname).toContain("/exchange/omnibridge/estimate");
    expect(parsed.searchParams.get("tokenAddress")).toBe(
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    );
    expect(parsed.searchParams.get("networkId")).toBe("1");
    expect(parsed.searchParams.get("targetChainId")).toBe("369");
    expect(parsed.searchParams.get("amount")).toBe("3000000");
  });
});
