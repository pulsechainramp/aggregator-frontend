import { describe, expect, it, beforeEach } from "vitest";
import { rememberSiweNonce, validateSiweMessage } from "./siwe";

const mockLocation = (host: string, origin: string) => {
  Object.defineProperty(window, "location", {
    value: {
      host,
      origin,
    },
    writable: true,
  });
};

const buildMessage = ({
  domain = "app.localhost",
  uri = "https://app.localhost",
  chainId = 369,
  nonce = "nonce-123",
  statement = "Sign in to PulseChainRamp",
}: {
  domain?: string;
  uri?: string;
  chainId?: number;
  nonce?: string;
  statement?: string;
} = {}) => {
  const issuedAt = new Date().toISOString();
  return `${domain} wants you to sign in with your Ethereum account:
0x0000000000000000000000000000000000000001

${statement}

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
`;
};

describe("validateSiweMessage", () => {
  beforeEach(() => {
    mockLocation("app.localhost", "https://app.localhost");
    // Clear stored nonce history between tests
    localStorage.clear();
  });

  it("returns parsed data for a valid challenge", () => {
    const message = buildMessage();
    const result = validateSiweMessage(
      message,
      "0x0000000000000000000000000000000000000001"
    );

    expect(result.preview.domain).toBe("app.localhost");
    expect(result.preview.chainId).toBe(369);
    expect(result.preview.nonce).toBe("nonce-123");
  });

  it("rejects challenges for unsupported domains", () => {
    const message = buildMessage({ domain: "evil.example" });

    expect(() =>
      validateSiweMessage(
        message,
        "0x0000000000000000000000000000000000000001"
      )
    ).toThrow(/domain/i);
  });

  it("rejects reused nonces", () => {
    const message = buildMessage({ nonce: "abc" });
    // Record nonce usage to simulate a prior flow
    rememberSiweNonce("abc");

    expect(() =>
      validateSiweMessage(
        message,
        "0x0000000000000000000000000000000000000001"
      )
    ).toThrow(/nonce/i);
  });
});
