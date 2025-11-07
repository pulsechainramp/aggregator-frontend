import { describe, expect, it, vi } from "vitest";
import type { Provider } from "../api/onramps";

vi.mock("../data/allowedProviderHosts", () => ({
  ALLOWED_PROVIDER_HOSTS: {
    simplex: ["simplex.com"],
    transak: ["transak.com"],
  },
}));

import { resolveProviderLink } from "./onrampLinks";

const baseProvider: Provider = {
  id: "simplex",
  display_name: "Simplex",
  type: "onramp",
  priority: 1,
};

const withLink = (overrides: Partial<Provider>): Provider => ({
  ...baseProvider,
  ...overrides,
});

describe("resolveProviderLink", () => {
  it("returns allowed https link when hostname matches allowlist", () => {
    const result = resolveProviderLink(
      withLink({ deeplink: "https://simplex.com/pay" })
    );

    expect(result).toEqual({
      href: "https://simplex.com/pay",
      blocked: false,
      host: "simplex.com",
    });
  });

  it("blocks links whose host does not match the allowlist", () => {
    const result = resolveProviderLink(
      withLink({ deeplink: "https://evil.example/pay" })
    );

    expect(result.href).toBeNull();
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("hostname_mismatch");
    expect(result.host).toBe("evil.example");
  });

  it("blocks candidates that fail URL sanitization", () => {
    const result = resolveProviderLink(
      withLink({ deeplink: "javascript:alert(1)" })
    );

    expect(result.href).toBeNull();
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("invalid_url");
    expect(result.host).toBeNull();
  });
});

