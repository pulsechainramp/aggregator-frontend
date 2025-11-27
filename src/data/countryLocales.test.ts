import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS } from "./countries";
import {
  COUNTRY_LOCALE_MAP,
  getDecimalStyleForCountry,
  getLocaleForCountry,
} from "./countryLocales";
import { getSeparatorsForLocale } from "../utils/numberFormat";

describe("COUNTRY_LOCALE_MAP", () => {
  it("has an entry for every COUNTRY_OPTIONS code", () => {
    COUNTRY_OPTIONS.forEach(({ code }) => {
      expect(COUNTRY_LOCALE_MAP[code]).toBeDefined();
      expect(getLocaleForCountry(code)).toBeTruthy();
    });
  });

  it("does not contain unknown country codes", () => {
    const validCodes = new Set(COUNTRY_OPTIONS.map(({ code }) => code));
    Object.keys(COUNTRY_LOCALE_MAP).forEach((code) => {
      expect(validCodes.has(code)).toBe(true);
    });
  });

  it("matches expected decimal separator for sample locales", () => {
    const sample = ["US", "DE", "FR", "BR", "MX", "ZA", "JP"] as const;

    sample.forEach((code) => {
      const info = COUNTRY_LOCALE_MAP[code];
      const style = getDecimalStyleForCountry(code);
      const separators = getSeparatorsForLocale(info.locale);
      if (style === "comma") {
        expect(separators.decimal).toBe(",");
      } else if (style === "dot") {
        expect(separators.decimal).toBe(".");
      }
    });
  });
});
