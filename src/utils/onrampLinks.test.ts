import { describe, expect, it } from "vitest";
import type { Provider } from "../api/onramps";
import { resolveProviderLink } from "./onrampLinks";

const providerBase: Provider = {
  id: "prov",
  display_name: "Provider",
  type: "onramp",
  priority: 1,
};

const clone = (overrides: Partial<Provider>): Provider => ({
  ...providerBase,
  ...overrides,
});

describe("resolveProviderLink", () => {
  it("prefers deeplink when safe", () => {
    const result = resolveProviderLink(
      clone({ deeplink: "https://safe.example.com" })
    );
    expect(result).toEqual({
      href: "https://safe.example.com/",
      blocked: false,
    });
  });

  it("falls back to regulator links when needed", () => {
    const result = resolveProviderLink(
      clone({
        deeplink: "javascript:alert(1)",
        coverage_url: null,
        regulator_links: ["https://reg.example.com/info"],
      })
    );
    expect(result).toEqual({
      href: "https://reg.example.com/info",
      blocked: false,
    });
  });

  it("reports blocked when every candidate is unsafe", () => {
    const result = resolveProviderLink(
      clone({
        deeplink: "javascript:alert(1)",
        coverage_url: "data:text/plain,hi",
      })
    );
    expect(result).toEqual({
      href: null,
      blocked: true,
    });
  });

  it("reports not blocked when there were no candidates at all", () => {
    const result = resolveProviderLink(clone({}));
    expect(result).toEqual({
      href: null,
      blocked: false,
    });
  });
});
