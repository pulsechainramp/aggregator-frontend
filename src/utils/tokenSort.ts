import { formatUnits } from "ethers";
import { TokenType } from "../types/Swap";

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
  decimals: number
) => {
  try {
    const raw = rawBalance ?? "0";
    if (BigInt(raw) === 0n) return "0";

    const formatted = formatUnits(raw, decimals);
    // Avoid Number overflow; use string-based thresholds
    const parts = formatted.split(".");
    const whole = parts[0];
    const fraction = parts[1] ?? "";

    // Very small
    if (whole === "0") {
      const significant = (fraction + "0000").slice(0, 4);
      return Number(`0.${significant}`) <= 0.0001 ? "<0.0001" : `0.${significant}`;
    }

    // Very large, shorten without Number coercion
    if (whole.length > 9) {
      const millions = whole.slice(0, whole.length - 6);
      const tail = whole.slice(whole.length - 6, whole.length - 4);
      return `${millions}.${tail}M`;
    }

    const numeric = Number(formatted);

    if (!Number.isFinite(numeric)) return formatted;
    if (numeric < 1) return numeric.toFixed(4);
    if (numeric < 1000) return numeric.toFixed(2);
    if (numeric < 1_000_000) return (numeric / 1000).toFixed(2) + "K";
    return (numeric / 1_000_000).toFixed(2) + "M";
  } catch {
    return "0";
  }
};
