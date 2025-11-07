import type { Provider } from "../api/onramps";
import { sanitizeExternalUrl } from "./url";

export type SafeProviderLink = {
  href: string | null;
  blocked: boolean;
};

export const resolveProviderLink = (provider: Provider): SafeProviderLink => {
  const candidates = [
    provider.deeplink,
    provider.coverage_url,
    ...(provider.regulator_links ?? []),
  ];

  let hadCandidate = false;

  for (const candidate of candidates) {
    if (!candidate) continue;
    hadCandidate = true;

    const safe = sanitizeExternalUrl(candidate);
    if (safe) {
      return { href: safe, blocked: false };
    }
  }

  return { href: null, blocked: hadCandidate };
};
