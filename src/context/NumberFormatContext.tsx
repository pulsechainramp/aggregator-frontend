import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchGeo } from "../api/onramps";
import { COUNTRY_OPTIONS } from "../data/countries";
import {
  COUNTRY_LOCALE_MAP,
  getLocaleForCountry,
} from "../data/countryLocales";
import {
  NormalizeOptions,
  normalizeNumberInput,
  parseLocaleNumber,
  sanitizeNumberInput,
} from "../utils/numberInput";
import {
  SmartFormatOptions,
  formatCompactTokenBalance,
  formatCurrency,
  formatPercentage,
  formatSmartNumber,
  formatTokenAmount,
  getSeparatorsForLocale,
} from "../utils/numberFormat";

type NumberFormatContextValue = {
  locale: string;
  localeOverride: string | null;
  country: string | null;
  currency: string;
  decimalSeparator: string;
  groupSeparator: string;
  ready: boolean;
  setLocaleOverride: (locale: string | null) => void;
  clearLocaleOverride: () => void;
  formatNumber: (value: number | string, opts?: SmartFormatOptions) => string;
  formatTokenAmount: (
    value: number | string | bigint,
    decimals: number,
    opts?: { maxFractionDigits?: number }
  ) => string;
  formatCurrency: (
    value: number | string | null | undefined,
    opts?: { currency?: string; fractionDigits?: number }
  ) => string | null;
  formatPercentage: (
    value: number | string,
    opts?: { fractionDigits?: number }
  ) => string;
  formatCompactTokenBalance: (
    rawBalance: string | bigint,
    decimals: number
  ) => string;
  sanitizeInput: (raw: string, opts?: NormalizeOptions) => string;
  normalizeInput: (raw: string) => string;
  parseInput: (raw: string) => number;
};

const NumberFormatContext = createContext<NumberFormatContextValue | undefined>(
  undefined
);

const getBrowserLocale = () => {
  if (typeof navigator === "undefined") return "en-US";
  const candidates = navigator.languages?.length
    ? navigator.languages
    : navigator.language
    ? [navigator.language]
    : [];
  return candidates[0] || "en-US";
};

const pickCurrencyForCountry = (country: string | null): string => {
  return "USD";
};

const matchBrowserLocaleToCountry = (browserLocale: string, country: string | null) => {
  if (!browserLocale || !country) return null;
  const parts = browserLocale.split("-");
  const region = parts[1]?.toUpperCase();
  return region === country ? browserLocale : null;
};

const LOCALE_OVERRIDE_STORAGE_KEY = "number-format-locale";

const getStoredLocaleOverride = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCALE_OVERRIDE_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stored : null;
  } catch {
    return null;
  }
};

const persistLocaleOverride = (locale: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (locale) {
      localStorage.setItem(LOCALE_OVERRIDE_STORAGE_KEY, locale);
    } else {
      localStorage.removeItem(LOCALE_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors (e.g., SSR or privacy mode)
  }
};

export const NumberFormatProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [localeOverride, setLocaleOverrideState] = useState<string | null>(
    () => getStoredLocaleOverride()
  );
  const [country, setCountry] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>(getBrowserLocale());
  const [currency, setCurrency] = useState<string>("USD");
  const [ready, setReady] = useState(false);
  const browserLocale = useMemo(() => getBrowserLocale(), []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const geo = await fetchGeo();
        const geoCountry = geo.country?.toUpperCase() ?? null;
        if (cancelled) return;
        setCountry(geoCountry);
      } catch {
        if (!cancelled) {
          setCountry(null);
        }
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [browserLocale]);

  useEffect(() => {
    const effectiveLocale =
      localeOverride ||
      matchBrowserLocaleToCountry(browserLocale, country) ||
      getLocaleForCountry(country) ||
      browserLocale ||
      "en-US";
    setLocale(effectiveLocale);
    setCurrency(pickCurrencyForCountry(country));
    setReady(true);
  }, [browserLocale, country, localeOverride]);

  const applyLocaleOverride = useCallback((next: string | null) => {
    setLocaleOverrideState(next);
    persistLocaleOverride(next);
  }, []);

  const separators = useMemo(
    () => getSeparatorsForLocale(locale),
    [locale]
  );

  const value = useMemo<NumberFormatContextValue>(() => {
    return {
      locale,
      localeOverride,
      country,
      currency,
      decimalSeparator: separators.decimal,
      groupSeparator: separators.group,
      ready,
      setLocaleOverride: applyLocaleOverride,
      clearLocaleOverride: () => applyLocaleOverride(null),
      formatNumber: (value, opts) =>
        formatSmartNumber(value, { locale, ...opts }),
      formatTokenAmount: (value, decimals, opts) =>
        formatTokenAmount(value, decimals, { locale, ...opts }),
      formatCurrency: (value, opts) =>
        formatCurrency(value, { locale, currency, ...opts }),
      formatPercentage: (value, opts) =>
        formatPercentage(value, { locale, ...opts }),
      formatCompactTokenBalance: (raw, decimals) =>
        formatCompactTokenBalance(raw, decimals, { locale }),
      sanitizeInput: (raw, opts) => sanitizeNumberInput(raw, opts),
      normalizeInput: (raw) => normalizeNumberInput(raw),
      parseInput: (raw) => parseLocaleNumber(raw),
    };
  }, [
    applyLocaleOverride,
    country,
    currency,
    locale,
    localeOverride,
    ready,
    separators.decimal,
    separators.group,
  ]);

  return (
    <NumberFormatContext.Provider value={value}>
      {children}
    </NumberFormatContext.Provider>
  );
};

export const useNumberFormat = (): NumberFormatContextValue => {
  const ctx = useContext(NumberFormatContext);
  if (!ctx) {
    throw new Error("useNumberFormat must be used within NumberFormatProvider");
  }
  return ctx;
};
