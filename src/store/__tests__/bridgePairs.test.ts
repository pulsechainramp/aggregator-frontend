import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchTokenPairs } from "../bridgeSlice";

// Small helper to run the thunk with a mocked fetch
const runThunk = async (currencies: any[]) => {
  const mockFetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, data: currencies }),
  }));
  vi.stubGlobal("fetch", mockFetch);
  const dispatch = vi.fn();
  const thunk = fetchTokenPairs();
  const result = await (thunk as any)(dispatch, () => ({}), undefined);
  return result.payload as { tokenPairs: any[]; tokens: any[] };
};

describe("fetchTokenPairs pairing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pairs native ETH to WETH-from-Ethereum on PulseChain", async () => {
    const { tokenPairs, tokens } = await runThunk([
      // Ethereum native
      {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        chainId: 1,
        tags: ["verified"],
      },
      // Pulse WETH from Ethereum
      {
        name: "Wrapped Ether from Ethereum",
        symbol: "WETH from Ethereum",
        decimals: 18,
        address: "0x02DcdD04e3F455D838cd1249292C58f3B79e3C3C",
        chainId: 369,
        tags: ["verified"],
      },
    ]);

    const pair = tokenPairs.find(
      (p) =>
        p.from.chainId === 1 &&
        p.from.symbol === "ETH" &&
        p.to.chainId === 369 &&
        p.to.symbol === "WETH from Ethereum"
    );
    expect(pair).toBeTruthy();
    expect(tokens.map((t) => t.symbol).sort()).toEqual(["ETH", "WETH from Ethereum"].sort());
  });

  it("builds native PLS to WPLS pair but keeps disallowed symbols out of exposed tokens", async () => {
    const { tokenPairs, tokens } = await runThunk([
      {
        name: "Pulse",
        symbol: "PLS",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        chainId: 369,
        tags: ["verified"],
      },
      {
        name: "Wrapped Pulse",
        symbol: "WPLS",
        decimals: 18,
        address: "0xA882606494D86804B5514E07e6Bd2D6a6eE6d68A",
        chainId: 1,
        tags: ["verified"],
      },
    ]);

    const pair = tokenPairs.find(
      (p) =>
        p.from.chainId === 369 &&
        p.from.symbol === "PLS" &&
        p.to.chainId === 1 &&
        p.to.symbol === "WPLS"
    );
    expect(pair).toBeTruthy();
    // PLS/WPLS are intentionally excluded from bridge token selector.
    expect(tokens).toEqual([]);
  });

  it('pairs "from Ethereum/PulseChain" symbols deterministically and filters extras', async () => {
    const { tokenPairs, tokens } = await runThunk([
      {
        name: "USDC",
        symbol: "USDC",
        decimals: 6,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        chainId: 1,
        tags: ["priority"],
      },
      {
        name: "USDC from Ethereum",
        symbol: "USDC from Ethereum",
        decimals: 6,
        address: "0x1234000000000000000000000000000000000001",
        chainId: 369,
        tags: ["verified"],
      },
      // Extra Pulse token with same cleaned symbol should be ignored
      {
        name: "USDC from Ethereum (old)",
        symbol: "USDC from Ethereum",
        decimals: 6,
        address: "0x1234000000000000000000000000000000000002",
        chainId: 369,
        tags: [],
      },
    ]);

    // Should pick the higher-ranked (priority/verified) pairing
    const pair = tokenPairs.find(
      (p) =>
        p.from.chainId === 1 &&
        p.from.symbol === "USDC" &&
        p.to.chainId === 369 &&
        p.to.address.toLowerCase() === "0x1234000000000000000000000000000000000001"
    );
    expect(pair).toBeTruthy();
    // Only paired tokens should remain exposed
    expect(tokens.map((t) => t.address.toLowerCase()).sort()).toEqual(
      ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "0x1234000000000000000000000000000000000001"].sort()
    );
  });
});
