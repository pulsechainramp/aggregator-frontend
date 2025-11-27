import { formatUnits } from "ethers";
import { TokenType } from "../types/Swap";
import { getSeparatorsForLocale } from "./numberFormat";

type SortParams = {
  tokens: TokenType[];
  searchTerm: string;
  balances: Record<string, string>;
  coreSymbols: Set<string>;
  corePriority?: string[];
};

const toLower = (value?: string | null) => (value ? value.toLowerCase() : "");

const parseBalanceUnits = (raw?: string) => {
  try {
    return BigInt(raw ?? "0");
  } catch {
    return 0n;
  }
};

export const filterAndSortTokensByBalance = ({
  tokens,
  searchTerm,
  balances,
  coreSymbols,
  corePriority = [],
}: SortParams): TokenType[] => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const priorityIndex = new Map<string, number>(
    corePriority.map((symbol, idx) => [symbol.toUpperCase(), idx])
  );

  const filtered = tokens.filter((token) => {
    if (!normalizedSearch) return true;
    const candidates = [token.symbol, token.name, token.address]
      .filter(Boolean)
      .map((value) => value!.toLowerCase());
    return candidates.some((value) => value.includes(normalizedSearch));
  });

  const decorated = filtered.map((token) => {
    const key = toLower(token.address);
    const balanceUnits = parseBalanceUnits(balances[key]);
    const isCore =
      token.tier === "core" ||
      coreSymbols.has((token.symbol ?? "").toUpperCase());
    const priority = priorityIndex.get((token.symbol ?? "").toUpperCase());

    return { token, balanceUnits, isCore, priority };
  });

  return decorated
    .sort((a, b) => {
      if (a.balanceUnits !== b.balanceUnits) {
        return a.balanceUnits > b.balanceUnits ? -1 : 1;
      }
      if (a.isCore !== b.isCore) {
        return a.isCore ? -1 : 1;
      }
      if (a.priority !== undefined || b.priority !== undefined) {
        const aRank = a.priority ?? Number.MAX_SAFE_INTEGER;
        const bRank = b.priority ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
      }
      const symbolCompare = toLower(a.token.symbol).localeCompare(
        toLower(b.token.symbol)
      );
      if (symbolCompare !== 0) {
        return symbolCompare;
      }
      return toLower(a.token.name).localeCompare(toLower(b.token.name));
    })
    .map((entry) => entry.token);
};

export const formatBalanceDisplay = (
  rawBalance: string | undefined,
  decimals: number,
  locale?: string
) => {
  try {
    const raw = rawBalance ?? "0";
    const asBigInt = BigInt(raw);
    if (asBigInt === 0n) return "0";

    const decimalString = formatUnits(asBigInt, decimals);
    const localeToUse = locale ?? "en-US";
    const numeric = Number(decimalString);

    // Use Intl for values within safe range and that won't round to zero
    if (
      Number.isFinite(numeric) &&
      Math.abs(numeric) >= 1e-10 &&
      decimalString.replace(/^0+|\./g, "").length <= 15
    ) {
      return new Intl.NumberFormat(localeToUse, {
        maximumFractionDigits: 6,
      }).format(numeric);
    }

    // Manual formatting to avoid precision loss for very large/small values
    const { decimal, group } = getSeparatorsForLocale(localeToUse);
    const isNegative = decimalString.startsWith("-");
    const unsigned = isNegative ? decimalString.slice(1) : decimalString;
    const [integerPartRaw, fractionRaw = ""] = unsigned.split(".");
    const groupedInteger = integerPartRaw.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      group
    );
    const trimmedFraction = fractionRaw.slice(0, 6).replace(/0+$/, "");
    const formatted =
      trimmedFraction.length > 0
        ? `${groupedInteger}${decimal}${trimmedFraction}`
        : groupedInteger;

    return isNegative ? `-${formatted}` : formatted;
  } catch {
    return "0";
  }
};
