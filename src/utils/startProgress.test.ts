import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  clearStoredProgress,
  computeStepStatus,
  readStoredProgress,
  writeStoredProgress,
} from "./startProgress";

const STORAGE_KEY = (account: string) => `startProgress:${account.toLowerCase()}`;

describe("startProgress storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("readStoredProgress", () => {
    it("returns empty object when account is falsy", () => {
      expect(readStoredProgress(undefined)).toEqual({});
      expect(readStoredProgress(null)).toEqual({});
      expect(readStoredProgress("")).toEqual({});
    });

    it("returns parsed progress for a stored account", () => {
      const key = STORAGE_KEY("0xAbC");
      localStorage.setItem(
        key,
        JSON.stringify({ hasTokens: true, hasBridge: false, lastUpdated: 1 })
      );
      expect(readStoredProgress("0xAbC")).toEqual({
        hasTokens: true,
        hasBridge: false,
        lastUpdated: 1,
      });
    });

    it("returns empty object when JSON is invalid", () => {
      const key = STORAGE_KEY("0xabc");
      localStorage.setItem(key, "{not-json");
      expect(readStoredProgress("0xabc")).toEqual({});
    });

    it("returns empty object when localStorage throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("boom");
      });
      expect(readStoredProgress("0xabc")).toEqual({});
    });
  });

  describe("writeStoredProgress", () => {
    it("persists merged progress with normalized account and timestamp", () => {
      vi.spyOn(Date, "now").mockReturnValue(12345);
      writeStoredProgress("0xABC", { hasTokens: true });

      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY("0xabc")) || "{}"
      );
      expect(stored).toEqual({ hasTokens: true, lastUpdated: 12345 });
    });

    it("merges with existing progress", () => {
      vi.spyOn(Date, "now").mockReturnValue(1);
      writeStoredProgress("0xabc", { hasTokens: true });
      vi.spyOn(Date, "now").mockReturnValue(2);
      writeStoredProgress("0xAbC", { hasBridge: true });

      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY("0xabc")) || "{}"
      );
      expect(stored).toEqual({
        hasTokens: true,
        hasBridge: true,
        lastUpdated: 2,
      });
    });

    it("does nothing when account is missing", () => {
      const setSpy = vi.spyOn(Storage.prototype, "setItem");
      writeStoredProgress(null, { hasTokens: true });
      expect(setSpy).not.toHaveBeenCalled();
    });

    it("swallows storage errors and warns", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("get error");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("set error");
      });
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => writeStoredProgress("0xabc", { hasTokens: true })).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("clearStoredProgress", () => {
    it("removes stored progress for an account", () => {
      localStorage.setItem(STORAGE_KEY("0xabc"), JSON.stringify({ hasSwap: true }));
      clearStoredProgress("0xAbC");
      expect(localStorage.getItem(STORAGE_KEY("0xabc"))).toBeNull();
    });

    it("does nothing when account is missing", () => {
      const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
      clearStoredProgress(undefined);
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe("computeStepStatus", () => {
    it("returns loading when loading is true", () => {
      expect(computeStepStatus({ loading: true })).toBe("loading");
    });

    it("returns error when error is set", () => {
      expect(computeStepStatus({ error: "oops" })).toBe("error");
    });

    it("returns complete when complete is true", () => {
      expect(computeStepStatus({ complete: true })).toBe("complete");
    });

    it("returns pending by default", () => {
      expect(computeStepStatus({})).toBe("pending");
    });
  });
});
