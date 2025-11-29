import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, beforeEach, vi, type Mock } from "vitest";
import reducer, {
  checkStartBalances,
  markSwapComplete,
  setAccount,
} from "./startProgressSlice";
import { executeSwapAction } from "./swapSlice";
import { bridgeTokens } from "./bridgeSlice";
import { getTokenBalance } from "../contracts/BridgeBalance";
import { readStoredProgress, writeStoredProgress } from "../utils/startProgress";

vi.mock("../contracts/BridgeBalance", () => ({
  getTokenBalance: vi.fn(),
}));

vi.mock("../utils/startProgress", () => ({
  readStoredProgress: vi.fn(),
  writeStoredProgress: vi.fn(),
}));

const mockGetTokenBalance = getTokenBalance as unknown as Mock;
const mockReadStoredProgress = readStoredProgress as unknown as Mock;
const mockWriteStoredProgress = writeStoredProgress as unknown as Mock;

const makeStore = () =>
  configureStore({
    reducer: { startProgress: reducer },
  });

describe("startProgressSlice", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockReadStoredProgress.mockReturnValue({});
  });

  describe("setAccount", () => {
    it("normalizes account and restores stored progress", () => {
      mockReadStoredProgress.mockReturnValue({
        hasTokens: true,
        hasBridge: false,
        hasSwap: true,
      });

      const state = reducer(undefined, setAccount("0xAbC"));

      expect(state.account).toBe("0xabc");
      expect(state.balances.complete).toBe(true);
      expect(state.bridge.complete).toBe(false);
      expect(state.swap.complete).toBe(true);
      expect(mockReadStoredProgress).toHaveBeenCalledWith("0xabc");
    });
  });

  describe("checkStartBalances thunk", () => {
    it("marks balances complete on success and persists progress", async () => {
      const store = makeStore();
      store.dispatch(setAccount("0xAbC"));
      mockGetTokenBalance.mockResolvedValue("1");
      vi.spyOn(Date, "now").mockReturnValue(111);

      const result = await store.dispatch(
        checkStartBalances({ account: "0xABC" })
      );

      expect(result.type).toBe(checkStartBalances.fulfilled.type);
      const state = store.getState().startProgress;
      expect(state.balances.complete).toBe(true);
      expect(state.balances.loading).toBe(false);
      expect(state.balances.error).toBeNull();
      expect(state.balances.lastChecked).toBe(111);
      expect(mockWriteStoredProgress).toHaveBeenCalledWith("0xabc", {
        hasTokens: true,
      });
    });

    it("records an error when balance checks fail", async () => {
      const store = makeStore();
      store.dispatch(setAccount("0xabc"));
      mockGetTokenBalance.mockRejectedValue(new Error("rpc fail"));
      vi.spyOn(Date, "now").mockReturnValue(222);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await store.dispatch(
        checkStartBalances({ account: "0xabc" })
      );

      expect(result.type).toBe(checkStartBalances.rejected.type);
      const state = store.getState().startProgress;
      expect(state.balances.complete).toBe(false);
      expect(state.balances.error).toContain("Failed");
      expect(state.balances.lastChecked).toBe(222);
      expect(mockWriteStoredProgress).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("rejects when balance parsing fails", async () => {
      const store = makeStore();
      store.dispatch(setAccount("0xabc"));
      mockGetTokenBalance.mockResolvedValue("not-a-number");
      vi.spyOn(Date, "now").mockReturnValue(333);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await store.dispatch(
        checkStartBalances({ account: "0xabc" })
      );

      expect(result.type).toBe(checkStartBalances.rejected.type);
      const state = store.getState().startProgress;
      expect(state.balances.complete).toBe(false);
      expect(state.balances.error).toContain("Failed");
      expect(state.balances.lastChecked).toBe(333);
      warnSpy.mockRestore();
    });

    it("succeeds with no balances when some tokens fail but at least one succeeds", async () => {
      const store = makeStore();
      store.dispatch(setAccount("0xabc"));

      mockGetTokenBalance
        .mockResolvedValueOnce("0") // ETH
        .mockRejectedValueOnce(new Error("fail")) // USDC
        .mockResolvedValue("0"); // rest default to 0

      const result = await store.dispatch(
        checkStartBalances({ account: "0xabc" })
      );

      expect(result.type).toBe(checkStartBalances.fulfilled.type);
      const state = store.getState().startProgress;
      expect(state.balances.complete).toBe(false);
      expect(state.balances.error).toBeNull();
      expect(mockWriteStoredProgress).not.toHaveBeenCalled();
    });
  });

  describe("markSwapComplete", () => {
    it("does nothing when no account is set", () => {
      const next = reducer(undefined, markSwapComplete());
      expect(next.swap.complete).toBe(false);
      expect(mockWriteStoredProgress).not.toHaveBeenCalled();
    });

    it("marks swap complete and persists when account is set", () => {
      const withAccount = reducer(undefined, setAccount("0xabc"));
      vi.spyOn(Date, "now").mockReturnValue(333);

      const next = reducer(withAccount, markSwapComplete());

      expect(next.swap.complete).toBe(true);
      expect(next.swap.error).toBeNull();
      expect(next.swap.lastChecked).toBe(333);
      expect(mockWriteStoredProgress).toHaveBeenCalledWith("0xabc", {
        hasSwap: true,
      });
    });
  });

  describe("integration with swap/bridge fulfillment", () => {
    it("marks swap complete on executeSwapAction fulfillment for current account", () => {
      const state = reducer(undefined, setAccount("0xabc"));
      vi.spyOn(Date, "now").mockReturnValue(444);

      const next = reducer(state, {
        type: executeSwapAction.fulfilled.type,
        meta: { arg: { account: "0xAbC" } },
      });

      expect(next.swap.complete).toBe(true);
      expect(next.swap.lastChecked).toBe(444);
      expect(mockWriteStoredProgress).toHaveBeenCalledWith("0xabc", {
        hasSwap: true,
      });
    });

    it("marks bridge complete on bridgeTokens fulfillment for current account", () => {
      const state = reducer(undefined, setAccount("0xabc"));
      vi.spyOn(Date, "now").mockReturnValue(555);

      const next = reducer(state, {
        type: bridgeTokens.fulfilled.type,
        meta: { arg: { userAddress: "0xAbC" } },
      });

      expect(next.bridge.complete).toBe(true);
      expect(next.bridge.lastChecked).toBe(555);
      expect(mockWriteStoredProgress).toHaveBeenCalledWith("0xabc", {
        hasBridge: true,
      });
    });

    it("does not update current state when fulfilled for a different account", () => {
      const state = reducer(undefined, setAccount("0xabc"));
      vi.spyOn(Date, "now").mockReturnValue(666);

      const next = reducer(state, {
        type: bridgeTokens.fulfilled.type,
        meta: { arg: { userAddress: "0xdef" } },
      });

      expect(next.bridge.complete).toBe(false);
      expect(next.bridge.lastChecked).toBeNull();
    });
  });
});
