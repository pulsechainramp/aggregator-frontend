import { describe, it, expect } from "vitest";
import { assertEthereumSourceChain } from "../BridgeContract";

describe("assertEthereumSourceChain", () => {
  it("allows Ethereum mainnet (chainId 1)", () => {
    expect(() => assertEthereumSourceChain(1)).not.toThrow();
  });

  it("rejects unsupported networks", () => {
    expect(() => assertEthereumSourceChain(369)).toThrow(
      /ethereum mainnet only/i
    );
  });
});
