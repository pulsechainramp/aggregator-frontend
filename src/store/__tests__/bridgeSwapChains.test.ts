import { describe, expect, it } from "vitest";
import bridgeReducer, {
  BridgeToken,
  TokenPair,
  swapChains,
} from "../bridgeSlice";

const buildToken = (
  symbol: string,
  address: string,
  chainId: number
): BridgeToken => ({
  name: symbol,
  symbol,
  decimals: 6,
  address,
  chainId,
  logoURI: "",
  tags: ["verified"],
  network: chainId === 1 ? "Ethereum" : "PulseChain",
});

const withPairingState = (
  selectedToken: BridgeToken,
  tokenPairs: TokenPair[],
  fromChainId: number,
  toChainId: number
) => ({
  ...bridgeReducer(undefined, { type: "@@INIT" }),
  selectedToken,
  tokenPairs,
  fromChainId,
  toChainId,
  amount: "1",
});

describe("bridge swapChains reducer", () => {
  it("remaps selected token from Ethereum to PulseChain counterpart", () => {
    const ethUsdc = buildToken(
      "USDC",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      1
    );
    const pulseUsdc = buildToken(
      "USDC from Ethereum",
      "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07",
      369
    );
    const pairs: TokenPair[] = [
      { from: ethUsdc, to: pulseUsdc },
      { from: pulseUsdc, to: ethUsdc },
    ];

    const state = withPairingState(ethUsdc, pairs, 1, 369);
    const next = bridgeReducer(state, swapChains());

    expect(next.fromChainId).toBe(369);
    expect(next.toChainId).toBe(1);
    expect(next.selectedToken?.chainId).toBe(369);
    expect(next.selectedToken?.address.toLowerCase()).toBe(
      pulseUsdc.address.toLowerCase()
    );
  });

  it("remaps selected token from PulseChain to Ethereum counterpart", () => {
    const ethUsdt = buildToken(
      "USDT",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      1
    );
    const pulseUsdt = buildToken(
      "USDT from Ethereum",
      "0x0Cb6F5a34ad42ec934882A05265A7d5F59b51A2f",
      369
    );
    const pairs: TokenPair[] = [
      { from: ethUsdt, to: pulseUsdt },
      { from: pulseUsdt, to: ethUsdt },
    ];

    const state = withPairingState(pulseUsdt, pairs, 369, 1);
    const next = bridgeReducer(state, swapChains());

    expect(next.fromChainId).toBe(1);
    expect(next.toChainId).toBe(369);
    expect(next.selectedToken?.chainId).toBe(1);
    expect(next.selectedToken?.address.toLowerCase()).toBe(
      ethUsdt.address.toLowerCase()
    );
  });
});
