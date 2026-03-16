import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertSupportedSourceChain,
  initializeBridgeManager,
} from "../BridgeContract";
import {
  BridgeManagerAddress,
  BridgeManagerAddressForNative,
  BridgeManagerAddressForNativePulse,
  BridgeManagerAddressPulse,
  ZeroAddress,
} from "../../const/swap";

vi.mock("../BridgeBalance", () => {
  return {
    getWalletProvider: () => ({
      eth: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Contract: vi.fn((_abi: any, address: string) => ({
          __address: address,
        })),
      },
    }),
  };
});

describe("assertSupportedSourceChain", () => {
  it("allows Ethereum mainnet (chainId 1)", () => {
    expect(() => assertSupportedSourceChain(1)).not.toThrow();
  });

  it("allows PulseChain (chainId 369)", () => {
    expect(() => assertSupportedSourceChain(369)).not.toThrow();
  });

  it("rejects unsupported networks", () => {
    expect(() => assertSupportedSourceChain(5)).toThrow(/supports bridging/i);
  });
});

describe("initializeBridgeManager router selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Ethereum native router for chain 1 native token", () => {
    const { bridgeManagerAddress } = initializeBridgeManager(1, ZeroAddress);
    expect(bridgeManagerAddress).toBe(BridgeManagerAddressForNative);
  });

  it("uses PulseChain native router for chain 369 native token", () => {
    const { bridgeManagerAddress } = initializeBridgeManager(369, ZeroAddress);
    expect(bridgeManagerAddress).toBe(BridgeManagerAddressForNativePulse);
  });

  it("uses PulseChain ERC20 router for chain 369 ERC20 token", () => {
    const erc20 = "0x1111111111111111111111111111111111111111";
    const { bridgeManagerAddress } = initializeBridgeManager(369, erc20);
    expect(bridgeManagerAddress).toBe(BridgeManagerAddressPulse);
  });

  it("uses Ethereum ERC20 router for chain 1 ERC20 token", () => {
    const erc20 = "0x2222222222222222222222222222222222222222";
    const { bridgeManagerAddress } = initializeBridgeManager(1, erc20);
    expect(bridgeManagerAddress).toBe(BridgeManagerAddress);
  });
});
