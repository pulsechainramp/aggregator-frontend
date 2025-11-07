import { describe, expect, it } from "vitest";
import { normalizeBackendURL } from "../swap";

describe("normalizeBackendURL", () => {
  it("normalizes an HTTPS URL and appends a trailing slash", () => {
    expect(
      normalizeBackendURL("https://example.com/api", { requireHttps: true })
    ).toBe("https://example.com/api/");
  });

  it("keeps existing trailing slash without duplicating", () => {
    expect(
      normalizeBackendURL("https://example.com/api/", { requireHttps: true })
    ).toBe("https://example.com/api/");
  });

  it("throws when the URL is not absolute", () => {
    expect(() => normalizeBackendURL("/relative", {})).toThrow(
      /absolute URL/i
    );
  });

  it("rejects URLs with search params or hash fragments", () => {
    expect(() =>
      normalizeBackendURL("https://example.com/api?query=1", {
        requireHttps: true,
      })
    ).toThrow(/must not include query/i);
    expect(() =>
      normalizeBackendURL("https://example.com/api#section", {
        requireHttps: true,
      })
    ).toThrow(/must not include query/i);
  });

  it("throws when HTTPS is required but an HTTP URL is provided", () => {
    expect(() =>
      normalizeBackendURL("http://localhost:3000", { requireHttps: true })
    ).toThrow(/HTTPS/i);
  });

  it("allows HTTP when HTTPS is not required", () => {
    expect(
      normalizeBackendURL("http://localhost:3000/api")
    ).toBe("http://localhost:3000/api/");
  });
});
