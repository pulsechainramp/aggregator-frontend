import { BackendURL } from "../const/swap";

const withBase = (path: string) =>
  new URL(path, BackendURL || window.location.origin).toString();

export type GeoResponse = { 
  ip?: string | null; 
  country: string | null;
  region?: string | null; 
  city?: string | null 
};

export type Provider = {
  id: string;
  display_name: string;
  type: "exchange" | "onramp";
  priority: number;
  deeplink?: string | null;
  deeplink_available?: boolean;
  deeplink_host?: string | null;
  link_blocked?: boolean;
  link_blocked_reason?: string | null;
  coverage_url?: string | null;
  regulator_links?: string[] | null;
  supported_payment_methods?: string[] | null;
  supports_fiat?: string[] | null;
  kyc_speed_hint?: string | null;
  limits_hint?: string | null;
  fee_hint?: string | null;
  risk_notes?: string | null;
  last_verified?: string | null;
  state_rules?: {
    unsupported?: string[];
    restricted?: string[];
    notes?: string | null;
  };
};

export type ProvidersResponse = {
  country: string;
  providers: Provider[];
  fallback_providers: string[];
  fallback_provider_details?: Provider[];
};

export async function fetchGeo(): Promise<GeoResponse> {
  // Prefer /onramps/geo; fall back to /geo for older deployments
  let res = await fetch(withBase("/onramps/geo"), { cache: "no-store" });
  if (!res.ok) res = await fetch(withBase("/geo"), { cache: "no-store" });

  const data = await res.json().catch(() => ({}));
  return {
    ip: data?.ip ?? null,
    country: (data?.country ?? null),
    region: data?.region ?? null,
    city: data?.city ?? null,
  };
}

export async function fetchProviders(params: {
  country: string;
  address?: string;
  amount?: string;
  fiat?: string;
}): Promise<ProvidersResponse> {
  const q = new URLSearchParams();
  q.set("country", params.country);
  if (params.address) q.set("address", params.address);
  if (params.amount) q.set("amount", params.amount);
  if (params.fiat) q.set("fiat", params.fiat);
  const r = await fetch(withBase(`/onramps/providers?${q.toString()}`), {
    cache: "no-store",
    credentials: "omit"
  });  
  if (!r.ok) throw new Error(`Providers error ${r.status}`);
  return r.json();
}
