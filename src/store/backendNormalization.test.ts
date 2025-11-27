import { describe, expect, it, vi, afterEach } from "vitest";
import { ethers } from "ethers";
import { getPulseXQuote } from "./swapSlice";
import { fetchBridgeEstimate } from "./bridgeSlice";

const noopDispatch = vi.fn();
const noopGetState = vi.fn(() => ({}));

describe("backend payload normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends dot-decimal amounts for swap quotes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          outputAmount: "1000",
          tokenInAddress: "0x1",
          tokenOutAddress: "0x2",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getPulseXQuote({
      tokenInAddress: "0xTokenIn",
      tokenOutAddress: "0xTokenOut",
      amount: "1,5",
      allowedSlippage: 0.5,
      fromDecimal: 18,
    })(noopDispatch, noopGetState, undefined);

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("amount")).toBe(
      ethers.parseUnits("1.5", 18).toString()
    );
  });

  it("sends dot-decimal amounts for bridge estimates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            tokenAddress: "0xToken",
            networkId: 1,
            amount: 0,
            estimatedAmount: 0,
            fee: 0,
            feePercentage: 0,
            isSupported: true,
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchBridgeEstimate({
      tokenAddress: "0xToken",
      networkId: 1,
      amount: "2.345,67",
    })(noopDispatch, noopGetState, undefined);

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("amount")).toBe("2345.67");
  });
});
