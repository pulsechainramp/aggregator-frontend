import { describe, expect, it } from "vitest";
import {
  isValidNumberInput,
  normalizeNumberInput,
  parseLocaleNumber,
  sanitizeNumberInput,
} from "./numberInput";

describe("numberInput utils", () => {
  it("sanitizes while preserving the first decimal separator", () => {
    expect(sanitizeNumberInput("1a2,3.4")).toBe("12,3.4");
    expect(sanitizeNumberInput("--1.2", { allowNegative: true })).toBe("-1.2");
  });

  it("normalizes EU and US styles to dot decimal", () => {
    expect(normalizeNumberInput("1,5")).toBe("1.5");
    expect(normalizeNumberInput("1.234,56")).toBe("1234.56");
    expect(normalizeNumberInput("1,234.56")).toBe("1234.56");
    expect(normalizeNumberInput("1,234")).toBe("1234");
    expect(normalizeNumberInput("1.234")).toBe("1234");
    expect(normalizeNumberInput("12,345")).toBe("12345");
    expect(normalizeNumberInput("12.345")).toBe("12345");
    expect(normalizeNumberInput("12,34,567.89")).toBe("1234567.89");
    expect(normalizeNumberInput("12.34.567,89")).toBe("1234567.89");
    expect(normalizeNumberInput("-0,001")).toBe("-0.001");
    expect(normalizeNumberInput("1.2345")).toBe("1.2345");
    expect(normalizeNumberInput("3,14159")).toBe("3.14159");
    expect(normalizeNumberInput("0,000123")).toBe("0.000123");
    expect(normalizeNumberInput("0.000123")).toBe("0.000123");
  });

  it("sanitizes then normalizes grouped numbers correctly", () => {
    expect(normalizeNumberInput(sanitizeNumberInput("12,345"))).toBe("12345");
    expect(normalizeNumberInput(sanitizeNumberInput("12.345"))).toBe("12345");
  });

  it("parses locale numbers to floats with fallback", () => {
    expect(parseLocaleNumber("1,234.56")).toBe(1234.56);
    expect(parseLocaleNumber("foo")).toBe(0);
  });

  it("validates normalized numeric strings", () => {
    expect(isValidNumberInput("1,5")).toBe(true);
    expect(isValidNumberInput("abc")).toBe(false);
    expect(isValidNumberInput("-")).toBe(false);
    expect(isValidNumberInput("-1,5", { allowNegative: true })).toBe(true);
  });
});
