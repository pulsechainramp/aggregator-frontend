import { describe, expect, it, beforeEach } from "vitest";
import { rememberSiweNonce, validateSiweMessage } from "./siwe";

const getGlobal = () => globalThis as any;

const memoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
};

const mockLocation = (host: string, origin: string) => {
  const g = getGlobal();
  g.window = g.window ?? {};
  g.window.location = {
    hostname: host,
    host,
    origin,
  };
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
    const g = getGlobal();
    g.localStorage = memoryStorage();
    mockLocation("app.localhost", "https://app.localhost");
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
