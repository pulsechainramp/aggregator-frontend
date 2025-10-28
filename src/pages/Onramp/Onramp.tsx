import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import CountrySelect from "../../components/onramp/CountrySelect";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { fetchGeo, fetchProviders, Provider } from "../../api/onramps";

const FALLBACK_COUNTRY = "ZZ";       // Not Listed
const COUNTRY_DEFAULT = "US";        // used only for fiat fallback
const DEFAULT_AMOUNT = "200";

const getFiatFor = (code?: string) =>
  COUNTRY_OPTIONS.find((c) => c.code === code)?.fiat ?? "USD";

function ProviderCard({ p }: { p: Provider }) {
  const href =
    p.deeplink ||
    (p as any).coverage_url ||
    (p as any).regulator_links?.[0] ||
    "#";

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4" aria-label={`${p.display_name} provider`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-white text-lg font-semibold">{p.display_name}</div>
          <div className="text-xs text-white/60">
            {(p.supported_payment_methods || []).join(" · ") || p.type}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] inline-flex items-center justify-center"
          >
            Visit
          </a>
        </div>
      </div>
    </li>
  );
}

export default function Onramp() {
  const [params] = useSearchParams();

  // Country is null until geo resolves (prevents ZZ/US flashing)
  const [country, setCountry] = useState<string | null>(null);
  const [geoResolved, setGeoResolved] = useState<boolean>(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [fallbackProviders, setFallbackProviders] = useState<Provider[]>([]);

  const [address, setAddress] = useState<string>("");
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // 0) Optional prefill from URL (?address=0x...)
  useEffect(() => {
    const addr = params.get("address");
    if (addr) setAddress(addr);
  }, [params]);

  // 1) Detect country via API geo (only once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const geo = await fetchGeo();
        if (!cancelled) setCountry((geo?.country || "").toUpperCase() || "ZZ");
      } catch {
        if (!cancelled) setCountry("ZZ");
      } finally {
        if (!cancelled) setGeoResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load providers only after geo is resolved and country is known
  const fiat = useMemo(
    () => getFiatFor(country ?? COUNTRY_DEFAULT),
    [country]
  );

  async function loadProviders(c: string) {
    try {
      setLoadingProviders(true);
      setErr(null);
      const resp = await fetchProviders({
        country: c,
        address,
        amount: DEFAULT_AMOUNT,
        fiat,
      });
      setProviders(resp.providers || []);
      setFallbackProviders(resp.fallback_provider_details || []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load providers");
    } finally {
      setLoadingProviders(false);
    }
  }

  useEffect(() => {
    if (!geoResolved || !country) return; // wait for geo
    loadProviders(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoResolved, country, address, fiat]);

  const showDefaults = !providers.length && fallbackProviders.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <header className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Buy Ethereum (ETH)</h1>
            <p className="text-slate-300">
              Pick your country, then choose a provider to purchase ETH with a card or bank transfer.
            </p>
          </header>

          {/* Step 1: Country + Address */}
          <section aria-labelledby="inputs" className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <h2 id="inputs" className="sr-only">Purchase inputs</h2>

            {!geoResolved ? (
              <div className="text-white/80">Detecting your country…</div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <label htmlFor="country" className="text-white/90 text-sm">Country</label>
                  <CountrySelect
                    value={country!} // non-null once geoResolved
                    onChange={(code) => setCountry(code)}
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <button
                    onClick={() => country && loadProviders(country)}
                    className="rounded-lg px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                  >
                    Refresh providers
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Providers */}
          <section aria-labelledby="providers" className="space-y-3">
            <h2 id="providers" className="text-xl font-semibold text-white">Providers</h2>

            {(!geoResolved || loadingProviders) && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
                Loading providers…
              </div>
            )}

            {!!err && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                {String(err)}
              </div>
            )}

            {geoResolved && !loadingProviders && !err && (
              <ul className="space-y-3">
                {providers.map((p) => <ProviderCard key={p.id} p={p} />)}

                {showDefaults && (
                  <li className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-2">
                      <div className="text-white font-medium">Default options</div>
                      <ul className="space-y-2">
                        {fallbackProviders.map((p) => (
                          <ProviderCard key={`fallback-${p.id}`} p={p} />
                        ))}
                      </ul>
                      <div className="text-xs text-white/60">
                        These are general entry points; availability varies by jurisdiction.
                      </div>
                    </div>
                  </li>
                )}

                {!providers.length && !fallbackProviders.length && (
                  <li className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    No providers found. Try changing your country to <span className="text-white">Not Listed (ZZ)</span>.
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Step 3: What to expect */}
          <section aria-labelledby="what-to-expect" className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <h2 id="what-to-expect" className="text-xl font-semibold text-white">What to expect</h2>
            <ul className="mt-2 list-disc pl-5 text-slate-300 space-y-1">
              <li>Click a provider, follow their steps, and pay with a card or bank transfer.</li>
              <li>Most providers ask for ID to meet regulations (KYC).</li>
            </ul>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
