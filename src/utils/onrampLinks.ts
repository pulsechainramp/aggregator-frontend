import type { Provider } from "../api/onramps";
import { sanitizeExternalUrl } from "./url";
import { ALLOWED_PROVIDER_HOSTS } from "../data/allowedProviderHosts";

const allowlistMap = ALLOWED_PROVIDER_HOSTS as Record<string, readonly string[]>;

type BlockReason = "invalid_url" | "hostname_mismatch";

export type SafeProviderLink = {
  href: string | null;
  blocked: boolean;
  host: string | null;
  reason?: BlockReason;
};

const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

const hostMatchesAllowlist = (providerId: string, host: string): boolean => {
  const normalized = normalizeHost(host);
  const allowedHosts = allowlistMap[providerId];
  if (!allowedHosts || allowedHosts.length === 0) return false;
  return allowedHosts.some(
    (allowedHost) =>
      normalized === allowedHost || normalized.endsWith(`.${allowedHost}`)
  );
};

export const resolveProviderLink = (provider: Provider): SafeProviderLink => {
  const candidates = [
    provider.deeplink,
    provider.coverage_url,
    ...(provider.regulator_links ?? []),
  ];

  let hadCandidate = false;
  let blockedHost: string | null = null;

  for (const candidate of candidates) {
    if (!candidate) continue;
    hadCandidate = true;

    const safe = sanitizeExternalUrl(candidate);
    if (!safe) continue;

    let hostname: string | null = null;
    try {
      hostname = normalizeHost(new URL(safe).hostname);
    } catch {
      hostname = null;
    }

    if (hostname && hostMatchesAllowlist(provider.id, hostname)) {
      return { href: safe, blocked: false, host: hostname };
    }

    blockedHost = hostname ?? blockedHost;
  }

  return {
    href: null,
    blocked: hadCandidate,
    host: blockedHost,
    reason: blockedHost ? "hostname_mismatch" : hadCandidate ? "invalid_url" : undefined,
  };
};
