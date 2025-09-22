import { BackendURL } from "../const/swap";

export type GeoResponse = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
};

export type Provider = {
  id: string;
  display_name: string;
  type: "exchange" | "onramp";
  priority: number;
  deeplink?: string | null;
  deeplink_available?: boolean;
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
};

export async function fetchGeo(): Promise<GeoResponse> {
  const r = await fetch(`${BackendURL}onramps/geo`, { credentials: "omit" });
  if (!r.ok) throw new Error(`Geo error ${r.status}`);
  return r.json();
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
  const r = await fetch(`${BackendURL}onramps/providers?${q.toString()}`, { credentials: "omit" });
  if (!r.ok) throw new Error(`Providers error ${r.status}`);
  return r.json();
}
