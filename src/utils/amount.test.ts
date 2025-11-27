import { describe, expect, it } from "vitest";
import { ethers } from "ethers";
import {
  normalizeAmountInput,
  areAmountsEqual,
  parseAmountToWei,
  tryParseAmountToWei,
  isPositiveAmount,
  compareAmountStrings,
  formatWeiAmount,
} from "./amount";

describe("normalizeAmountInput", () => {
  it("trims whitespace but preserves precision", () => {
    const input = "  0.0000001  ";
    const normalized = normalizeAmountInput(input);
    expect(normalized).toBe("0.0000001");
    expect(() => ethers.parseUnits(normalized, 18)).not.toThrow();
  });

  it("accepts comma decimals and normalizes to dot", () => {
    expect(normalizeAmountInput("1,5")).toBe("1.5");
    expect(normalizeAmountInput("1.234,56")).toBe("1234.56");
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

describe("amount helpers", () => {
  it("parses to wei without losing precision", () => {
    const wei = parseAmountToWei("123.456", 6);
    expect(wei).toBe(123456000n);
  });

  it("tryParse returns null on invalid input", () => {
    expect(tryParseAmountToWei("foo", 18)).toBeNull();
  });

  it("detects positive amounts", () => {
    expect(isPositiveAmount("0.000000000000000001", 18)).toBe(true);
    expect(isPositiveAmount("0", 18)).toBe(false);
  });

  it("compares amount strings", () => {
    expect(compareAmountStrings("1.1", "1.09", 18)).toBe(1);
    expect(compareAmountStrings("1.09", "1.1", 18)).toBe(-1);
    expect(compareAmountStrings("2", "2.000", 18)).toBe(0);
  });

  it("formats wei back to decimal string", () => {
    const formatted = formatWeiAmount(ethers.parseUnits("0.1234", 18), 18);
    expect(formatted).toBe("0.1234");
  });
});
