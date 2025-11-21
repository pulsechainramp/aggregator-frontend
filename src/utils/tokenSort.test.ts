import { describe, expect, it } from "vitest";
import { filterAndSortTokensByBalance, formatBalanceDisplay } from "./tokenSort";
import { TokenType } from "../types/Swap";

const makeToken = (
  address: string,
  symbol: string,
  overrides: Partial<TokenType> = {}
): TokenType => ({
  chainId: 369,
  address,
  symbol,
  name: symbol,
  decimals: 18,
  origin: "native",
  tier: "verified",
  status: "active",
  sources: {},
  ...overrides,
});

describe("filterAndSortTokensByBalance", () => {
  it("sorts by balance descending then core flag", () => {
    const tokens = [
      makeToken("0x1", "AAA"),
      makeToken("0x2", "BBB", { tier: "core" }),
      makeToken("0x3", "CCC"),
    ];
    const balances = {
      "0x1": "1000000000000000000", // 1
      "0x2": "3000000000000000000", // 3
      "0x3": "0",
    };

    const sorted = filterAndSortTokensByBalance({
      tokens,
      searchTerm: "",
      balances,
      coreSymbols: new Set(["BBB"]),
      corePriority: ["BBB"],
    });

    expect(sorted.map((t) => t.symbol)).toEqual(["BBB", "AAA", "CCC"]);
  });

  it("prioritizes core tokens when balances are equal", () => {
    const tokens = [
      makeToken("0xa", "AAA"),
      makeToken("0xb", "BBB", { tier: "core" }),
    ];
    const balances: Record<string, string> = {
      "0xa": "0",
      "0xb": "0",
    };

    const sorted = filterAndSortTokensByBalance({
      tokens,
      searchTerm: "",
      balances,
      coreSymbols: new Set(["BBB"]),
      corePriority: ["BBB"],
    });

    expect(sorted.map((t) => t.symbol)).toEqual(["BBB", "AAA"]);
  });

  it("filters by search term before sorting", () => {
    const tokens = [
      makeToken("0x1", "ONE"),
      makeToken("0x2", "TWO"),
    ];
    const balances: Record<string, string> = {
      "0x1": "5000000000000000000",
      "0x2": "10000000000000000000",
    };

    const sorted = filterAndSortTokensByBalance({
      tokens,
      searchTerm: "two",
      balances,
      coreSymbols: new Set<string>(),
      corePriority: [],
    });

    expect(sorted.map((t) => t.symbol)).toEqual(["TWO"]);
  });

  it("respects core priority order when balances are zero", () => {
    const tokens = [
      makeToken("0xpls", "PLS", { tier: "core" }),
      makeToken("0xplsx", "PLSX", { tier: "core" }),
      makeToken("0xdai", "DAI", { tier: "core" }),
      makeToken("0xhex", "HEX", { tier: "core" }),
    ];
    const balances: Record<string, string> = {};

    const sorted = filterAndSortTokensByBalance({
      tokens,
      searchTerm: "",
      balances,
      coreSymbols: new Set(["PLS", "PLSX", "DAI", "HEX"]),
      corePriority: ["PLS", "PLSX", "HEX", "DAI"],
    });

    expect(sorted.map((t) => t.symbol)).toEqual(["PLS", "PLSX", "HEX", "DAI"]);
  });
});

describe("formatBalanceDisplay", () => {
  it("formats large, small, and zero balances", () => {
    expect(formatBalanceDisplay("0", 18)).toEqual("0");
    expect(formatBalanceDisplay("100000000000000", 18)).toEqual("<0.0001");
    expect(formatBalanceDisplay("1500000000000000000", 18)).toEqual("1.50");
  });
});
