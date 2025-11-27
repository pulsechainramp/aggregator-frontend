import { describe, expect, it } from "vitest";
import {
  formatCompactTokenBalance,
  formatCurrency,
  formatPercentage,
  formatSmartNumber,
  formatTokenAmount,
  getSeparatorsForLocale,
  getSmartDecimalPrecision,
} from "./numberFormat";

describe("numberFormat utils", () => {
  it("detects locale separators", () => {
    expect(getSeparatorsForLocale("en-US").decimal).toBe(".");
    expect(getSeparatorsForLocale("de-DE").decimal).toBe(",");
    expect(getSeparatorsForLocale("fr-FR").decimal).toBe(",");
    expect(getSeparatorsForLocale("pt-BR").decimal).toBe(",");
  });

  it("chooses smart precision based on magnitude", () => {
    expect(getSmartDecimalPrecision(1500)).toBe(0);
    expect(getSmartDecimalPrecision(150)).toBe(2);
    expect(getSmartDecimalPrecision(15)).toBe(4);
    expect(getSmartDecimalPrecision(1.5)).toBe(6);
  });

  it("formats numbers with smart defaults", () => {
    expect(formatSmartNumber(1234.567)).toBe("1,235");
    expect(formatSmartNumber(12.3456)).toBe("12.3456");
  });

  it("formats token amounts with decimals", () => {
    expect(formatTokenAmount(123456n, 2)).toBe("1,234.56");
    expect(formatTokenAmount(1n, 6)).toBe("0.000001");
  });

  it("formats currency and percentages", () => {
    expect(formatCurrency(12.5, { currency: "USD" })).toBe("$12.50");
    expect(formatPercentage(0.1234)).toBe("12.34%");
  });

  it("formats compact balances", () => {
    const compact = formatCompactTokenBalance("1234500000000000000000", 18);
    expect(compact).toContain("K");
  });

  it("formats very large values with grouping instead of raw strings", () => {
    const huge = "123450000000000000000000000000000000"; // 1e35-ish
    expect(formatTokenAmount(huge, 0)).toContain(",");
    const compact = formatCompactTokenBalance(huge, 0);
    expect(compact).toContain(",");
    expect(compact).not.toMatch(/K|M|B|T|P|E/);
  });
});
