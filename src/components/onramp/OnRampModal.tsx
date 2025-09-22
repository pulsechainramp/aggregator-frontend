import React, { useEffect, useMemo, useState } from "react";
import { fetchGeo, fetchProviders, Provider } from "../../api/onramps";
import CountrySelect from "./CountrySelect";
import { COUNTRY_OPTIONS } from "../../data/countries";

type Props = {
  open: boolean;
  onClose: () => void;
  address?: string;
};

const COUNTRY_DEFAULT = "US";
const DEFAULT_AMOUNT = "200";
const getFiatFor = (code: string) =>
    COUNTRY_OPTIONS.find(c => c.code === code)?.fiat ?? "USD";

export default function OnRampModal({ open, onClose, address }: Props) {
  const [country, setCountry] = useState<string>(COUNTRY_DEFAULT);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const geo = await fetchGeo();
        if (geo.country) setCountry(geo.country);
      } catch (e: any) {
        setErr(e?.message ?? "geo error");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  async function loadProviders(c: string) {
    try {
      setLoading(true);
      setErr(null);
      const resp = await fetchProviders({
        country: c || COUNTRY_DEFAULT,
        address,
        amount: DEFAULT_AMOUNT,
        fiat: getFiatFor(c || COUNTRY_DEFAULT),
      });
      setProviders(resp.providers || []);
    } catch (e: any) {
      setErr(e?.message ?? "provider error");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadProviders(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, country, address]);

  const visible = open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none";

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center transition ${visible}`}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* modal */}
      <div className="relative z-10 w-[92vw] max-w-xl rounded-2xl border border-white/10 bg-[#151528] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Buy Ethereum (ETH)</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <label className="text-sm text-white/70">Country</label>
          <CountrySelect value={country} onChange={(c) => setCountry(c.toUpperCase())} />
          <button
            onClick={() => loadProviders(country)}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            Refresh
          </button>
        </div>

        {loading && <div className="py-6 text-center text-white/80">Loading providers…</div>}
        {err && <div className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        {!loading && !err && (
          <ul className="space-y-3">
            {providers.map((p) => (
              <li key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-white font-medium">{p.display_name}</div>
                    <div className="text-xs text-white/60">
                      {(p.supported_payment_methods || []).join(" · ") || p.type}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={p.deeplink || p.coverage_url || (p.regulator_links?.[0] ?? "#")}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        p.deeplink ? "bg-indigo-500 text-white hover:bg-indigo-400" : "bg-white/10 text-white/80"
                      }`}
                    >
                      Continue
                    </a>
                  </div>
                </div>
              </li>
            ))}
            {!providers.length && (
              <li className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                No providers found for {country}. Try a different 2-letter code (e.g., US, GB, DE).
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
