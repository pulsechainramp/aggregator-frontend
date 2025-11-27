import { formatUnits } from "ethers";

export type SmartFormatOptions = {
  locale?: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;
};

export const getSeparatorsForLocale = (
  locale: string
): { decimal: string; group: string } => {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  return { decimal, group };
};

export const getSmartDecimalPrecision = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (Math.abs(value) >= 1000) return 0;
  if (Math.abs(value) >= 100) return 2;
  if (Math.abs(value) >= 10) return 4;
  return 6;
};

export const formatSmartNumber = (
  value: number | string | null | undefined,
  opts: SmartFormatOptions = {}
): string => {
  if (value === null || value === undefined) return "";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "";

  const locale = opts.locale ?? "en-US";
  const maxFractionDigits =
    opts.maxFractionDigits ?? getSmartDecimalPrecision(numeric);
  const minFractionDigits = opts.minFractionDigits ?? 0;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: minFractionDigits,
  }).format(numeric);
};

export const formatTokenAmount = (
  value: number | string | bigint,
  decimals: number,
  opts?: { locale?: string; maxFractionDigits?: number }
): string => {
  const locale = opts?.locale ?? "en-US";
  const maxFractionDigits = opts?.maxFractionDigits ?? Math.min(6, decimals);
  const separators = getSeparatorsForLocale(locale);
  const formatter = new Intl.NumberFormat(locale);

  const formatHuge = (decimalString: string) => {
    const [integerPart, fractionPart] = decimalString.split(".");
    const groupedInteger = formatter.format(BigInt(integerPart));
    if (!fractionPart || maxFractionDigits === 0) return groupedInteger;
    const trimmedFraction = fractionPart.slice(0, maxFractionDigits).replace(/0+$/, "");
    return trimmedFraction ? `${groupedInteger}${separators.decimal}${trimmedFraction}` : groupedInteger;
  };

  try {
    const asBigInt = typeof value === "bigint" ? value : BigInt(value);
    const decimalString = formatUnits(asBigInt, decimals);
    const numeric = Number(decimalString);
    if (!Number.isFinite(numeric) || Math.abs(numeric) > Number.MAX_SAFE_INTEGER) {
      return formatHuge(decimalString);
    }
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: maxFractionDigits,
    }).format(numeric);
  } catch {
    return "0";
  }
};

export const formatCurrency = (
  value: number | string | null | undefined,
  opts?: { locale?: string; currency?: string; fractionDigits?: number }
): string | null => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return null;

  const locale = opts?.locale ?? "en-US";
  const currency = opts?.currency ?? "USD";
  const fractionDigits = opts?.fractionDigits ?? 2;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
};

export const formatPercentage = (
  value: number | string,
  opts?: { locale?: string; fractionDigits?: number }
): string => {
  const numeric = typeof value === "string" ? Number(value) : value;
  const locale = opts?.locale ?? "en-US";
  const fractionDigits = opts?.fractionDigits ?? 2;

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
};

export const formatCompactTokenBalance = (
  rawBalance: string | bigint,
  decimals: number,
  opts?: { locale?: string }
): string => {
  const locale = opts?.locale ?? "en-US";
  const separators = getSeparatorsForLocale(locale);
  const formatter = new Intl.NumberFormat(locale);

  const formatHugeCompact = (decimalString: string) => {
    const [integerPart] = decimalString.split(".");
    const digits = integerPart.replace(/^0+/, "") || "0";
    const magnitude = digits.length - 1;
    const groupIndex = Math.floor(magnitude / 3);
    const suffixes = ["", "K", "M", "B", "T", "P", "E"];
    if (groupIndex <= 0) {
      return formatter.format(BigInt(integerPart));
    }
    if (groupIndex >= suffixes.length) {
      // Too large for our compact suffixes; fall back to full grouped integer.
      return formatter.format(BigInt(integerPart));
    }
    const cappedGroup = groupIndex;
    const scale = cappedGroup * 3;
    const leading = digits.slice(0, digits.length - scale);
    const remainder = digits.slice(digits.length - scale, digits.length - scale + 2);
    const fraction = remainder.slice(0, 2).replace(/0+$/, "");
    const base = fraction ? `${leading}${separators.decimal}${fraction}` : leading;
    return `${base}${suffixes[cappedGroup]}`;
  };

  try {
    const asBigInt = typeof rawBalance === "bigint" ? rawBalance : BigInt(rawBalance);
    const decimalString = formatUnits(asBigInt, decimals);
    const numeric = Number(decimalString);
    if (!Number.isFinite(numeric) || Math.abs(numeric) > Number.MAX_SAFE_INTEGER) {
      return formatHugeCompact(decimalString);
    }
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return "0";
  }
};
