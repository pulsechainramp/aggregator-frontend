export type NormalizeOptions = {
  allowNegative?: boolean;
};

export const sanitizeNumberInput = (
  raw: string,
  opts: NormalizeOptions = {}
): string => {
  if (!raw) return "";
  const allowNegative = opts.allowNegative ?? false;
  let sanitized = "";
  let negativeSeen = false;

  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      sanitized += char;
      continue;
    }

    if (char === "." || char === ",") {
      sanitized += char;
      continue;
    }

    if (char === "-" && allowNegative && !negativeSeen && sanitized.length === 0) {
      sanitized += char;
      negativeSeen = true;
    }
  }

  return sanitized;
};

export const normalizeNumberInput = (raw: string): string => {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const isNegative = trimmed.startsWith("-");
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;

  const dotIndexes: number[] = [];
  const commaIndexes: number[] = [];

  for (let i = 0; i < unsigned.length; i++) {
    if (unsigned[i] === ".") dotIndexes.push(i);
    if (unsigned[i] === ",") commaIndexes.push(i);
  }

  // Decide which symbol is the decimal separator (if any).
  let decimalSymbol: "." | "," | null = null;

  if (dotIndexes.length && commaIndexes.length) {
    // Both present: the last separator wins as decimal; the rest are grouping.
    const lastDot = dotIndexes[dotIndexes.length - 1];
    const lastComma = commaIndexes[commaIndexes.length - 1];
    decimalSymbol = lastDot > lastComma ? "." : ",";
  } else if (dotIndexes.length) {
    if (dotIndexes.length === 1) {
      const separatorIndex = dotIndexes[0];
      const intPart = unsigned.slice(0, separatorIndex);
      const fractionPart = unsigned.slice(separatorIndex + 1);
      const intValue = Number(intPart || "0");
      const isGroupingPattern =
        fractionPart.length === 3 &&
        intValue !== 0 &&
        intPart.length >= 1 &&
        intPart.length <= 3;
      if (!isGroupingPattern) {
        decimalSymbol = ".";
      }
    }
    // Multiple dots => treat as grouping-only.
  } else if (commaIndexes.length) {
    if (commaIndexes.length === 1) {
      const separatorIndex = commaIndexes[0];
      const intPart = unsigned.slice(0, separatorIndex);
      const fractionPart = unsigned.slice(separatorIndex + 1);
      const intValue = Number(intPart || "0");
      const isGroupingPattern =
        fractionPart.length === 3 &&
        intValue !== 0 &&
        intPart.length >= 1 &&
        intPart.length <= 3;
      if (!isGroupingPattern) {
        decimalSymbol = ",";
      }
    }
    // Multiple commas => treat as grouping-only.
  }

  let normalized = "";
  let decimalInserted = false;

  for (const char of unsigned) {
    if (char >= "0" && char <= "9") {
      normalized += char;
      continue;
    }

    if ((char === "." || char === ",") && decimalSymbol && char === decimalSymbol) {
      if (decimalInserted) continue;
      normalized += ".";
      decimalInserted = true;
      continue;
    }
  }

  if (isNegative && normalized) {
    return `-${normalized}`;
  }

  return normalized;
};

export const parseLocaleNumber = (raw: string): number => {
  const normalized = normalizeNumberInput(raw);
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const isValidNumberInput = (
  raw: string,
  opts: NormalizeOptions = {}
): boolean => {
  const normalized = normalizeNumberInput(raw);
  if (normalized === "" || normalized === "-" || normalized === ".") {
    return false;
  }
  const allowNegative = opts.allowNegative ?? false;
  const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
  return pattern.test(normalized);
};
