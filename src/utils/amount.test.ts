import { describe, expect, it } from "vitest";
import { ethers } from "ethers";
import { normalizeAmountInput, areAmountsEqual } from "./amount";

describe("normalizeAmountInput", () => {
  it("trims whitespace but preserves precision", () => {
    const input = "  0.0000001  ";
    const normalized = normalizeAmountInput(input);
    expect(normalized).toBe("0.0000001");
    expect(() => ethers.parseUnits(normalized, 18)).not.toThrow();
  });

  it("rejects empty strings", () => {
    expect(() => normalizeAmountInput("   ")).toThrow(/required/i);
  });

  it("rejects lone decimal point", () => {
    expect(() => normalizeAmountInput(".")).toThrow(/invalid/i);
  });
});

describe("areAmountsEqual", () => {
  it("returns true for equal trimmed values", () => {
    expect(areAmountsEqual(" 1.23 ", "1.23")).toBe(true);
  });

  it("returns false for mismatched values", () => {
    expect(areAmountsEqual("1.230", "1.23")).toBe(false);
  });

  it("returns false when left side is empty", () => {
    expect(areAmountsEqual("  ", "1")).toBe(false);
  });
});
