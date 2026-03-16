import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../referralSlice", () => {
  return {
    ensureSiweSessionAction: vi.fn((payload: any) => ({
      type: "mock/ensureSiweSessionAction",
      payload,
    })),
    clearSiweAuth: vi.fn(() => ({
      type: "mock/clearSiweAuth",
    })),
  };
});

import { fetchUserTransactions } from "../activitySlice";
import {
  clearSiweAuth,
  ensureSiweSessionAction,
} from "../referralSlice";

const userAddress = "0x6cc99a61acaef236e346e91a13125820a88078e7";

const sampleTx = {
  id: "tx-1",
  messageId: "0x1",
  userAddress,
  sourceChainId: 369,
  targetChainId: 1,
  sourceTxHash: "0xabc",
  targetTxHash: null,
  tokenAddress: "0xdef",
  tokenSymbol: "USDC from Ethereum",
  tokenDecimals: 6,
  amount: "3000000",
  status: "pending",
  sourceTimestamp: new Date().toISOString(),
  targetTimestamp: null,
  encodedData: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  humanReadableAmount: "3",
  statusDetail: "claim_required",
  isClaimable: true,
};

describe("fetchUserTransactions auth retry", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clears auth and retries once with forced SIWE after a 401", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [sampleTx],
        }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const dispatch = vi.fn((action: any) => {
      if (action?.type === "mock/ensureSiweSessionAction") {
        const token = action.payload?.force ? "fresh-token" : "stale-token";
        return { unwrap: async () => token };
      }
      return action;
    });

    const thunk = fetchUserTransactions(userAddress);
    const result = await (thunk as any)(dispatch, () => ({}), undefined);

    expect(result.type).toBe("activity/fetchUserTransactions/fulfilled");
    expect(result.payload).toHaveLength(1);
    expect(result.payload[0].statusDetail).toBe("claim_required");

    expect(ensureSiweSessionAction).toHaveBeenNthCalledWith(1, {
      address: userAddress,
      purpose: "bridge-activity",
      force: false,
    });
    expect(ensureSiweSessionAction).toHaveBeenNthCalledWith(2, {
      address: userAddress,
      purpose: "bridge-activity",
      force: true,
    });

    expect(clearSiweAuth).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "mock/clearSiweAuth" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstOptions = mockFetch.mock.calls[0][1];
    const secondOptions = mockFetch.mock.calls[1][1];
    expect(firstOptions?.headers?.Authorization).toBe("Bearer stale-token");
    expect(secondOptions?.headers?.Authorization).toBe("Bearer fresh-token");
  });

  it("does not force re-sign when the first request succeeds", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [sampleTx],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const dispatch = vi.fn((action: any) => {
      if (action?.type === "mock/ensureSiweSessionAction") {
        return { unwrap: async () => "valid-token" };
      }
      return action;
    });

    const thunk = fetchUserTransactions(userAddress);
    const result = await (thunk as any)(dispatch, () => ({}), undefined);

    expect(result.type).toBe("activity/fetchUserTransactions/fulfilled");
    expect(ensureSiweSessionAction).toHaveBeenCalledTimes(1);
    expect(ensureSiweSessionAction).toHaveBeenCalledWith({
      address: userAddress,
      purpose: "bridge-activity",
      force: false,
    });
    expect(clearSiweAuth).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1]?.headers?.Authorization).toBe(
      "Bearer valid-token"
    );
  });
});
