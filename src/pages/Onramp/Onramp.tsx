import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import CountrySelect from "../../components/onramp/CountrySelect";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { fetchGeo, fetchProviders, Provider } from "../../api/onramps";
import { resolveProviderLink } from "../../utils/onrampLinks";

const FALLBACK_COUNTRY = "ZZ"; // Not Listed fallback
const COUNTRY_DEFAULT = "US"; // used only for fiat fallback
const DEFAULT_AMOUNT = "200";

const getFiatFor = (code?: string) =>
  COUNTRY_OPTIONS.find((c) => c.code === code)?.fiat ?? "USD";

function ProviderCard({ p }: { p: Provider }) {
  const { href, blocked, host, reason } = resolveProviderLink(p);
  const isDisabled = !href;
  const buttonLabel = isDisabled ? "Link unavailable" : "Visit site";

  return (
    <li
      className="rounded-xl border border-border bg-bg-surface p-4 shadow-sm"
      aria-label={`${p.display_name} provider`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-text">{p.display_name}</div>
          <div className="text-xs text-text-muted">
            {(p.supported_payment_methods || []).join(" / ") || p.type}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <a
            href={href ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={isDisabled}
            className={`touch-target inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 text-base font-semibold text-white hover:text-white focus-visible:text-white active:text-white shadow-sm transition-transform transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-0 sm:w-auto sm:min-w-[9rem] ${
              isDisabled
                ? "pointer-events-none cursor-not-allowed opacity-60"
                : "hover:-translate-y-0.5 hover:bg-primary-600"
            }`}
            onClick={(event) => {
              if (isDisabled) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <span>{buttonLabel}</span>
            <span aria-hidden="true" className="text-lg">
              &rarr;
            </span>
          </a>
        </div>
        {blocked && (
          <p className="text-xs text-danger">
            {reason === "hostname_mismatch"
              ? `Provider link blocked: ${host ?? "unknown host"} is not on the vetted domain list.`
              : "Provider link was blocked because it used an invalid or unsafe URL scheme."}
          </p>
        )}
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

  // Optional prefill from URL (?address=0x...)
  useEffect(() => {
    const addr = params.get("address");
    if (addr) setAddress(addr);
  }, [params]);

  // Detect country via API geo (only once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const geo = await fetchGeo();
        if (!cancelled) {
          setCountry((geo?.country || "").toUpperCase() || FALLBACK_COUNTRY);
        }
      } catch {
        if (!cancelled) {
          setCountry(FALLBACK_COUNTRY);
        }
      } finally {
        if (!cancelled) {
          setGeoResolved(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine fiat after geo
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
      setProviders([]);
      setFallbackProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  }

  useEffect(() => {
    if (!geoResolved || !country) return;
    loadProviders(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoResolved, country, address, fiat]);

  const showDefaults = !providers.length && fallbackProviders.length > 0;

  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-text sm:text-4xl">
              Buy Ethereum (ETH)
            </h1>
            <p className="text-text-muted">
              Pick your country, then choose a provider to purchase ETH with a card or bank transfer.
            </p>
          </header>

          {/* Step 1: Country */}
          <section
            aria-labelledby="inputs"
            className="rounded-xl border border-border bg-bg-surface p-4 shadow-sm sm:p-5"
          >
            <h2 id="inputs" className="sr-only">
              Purchase inputs
            </h2>

            {!geoResolved ? (
              <div className="text-text-muted">Detecting your country...</div>
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-2 lg:w-1/2">
                  <label
                    htmlFor="country"
                    className="text-sm font-semibold text-text"
                  >
                    Country
                  </label>
                  <CountrySelect
                    value={country!}
                    onChange={(code) => setCountry(code)}
                    className="min-h-[44px] w-full"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Providers */}
          <section aria-labelledby="providers" className="space-y-3">
            <h2 id="providers" className="text-xl font-semibold text-text">
              Providers
            </h2>

            {(!geoResolved || loadingProviders) && (
              <div
                className="rounded-xl border border-border bg-bg-surface p-4 text-text-muted"
                role="status"
                aria-live="polite"
              >
                Loading providers...
              </div>
            )}

            {!!err && (
              <div
                className="rounded-xl border border-danger bg-danger/10 p-4 text-danger"
                role="alert"
                aria-live="assertive"
              >
                {String(err)}
              </div>
            )}

            {geoResolved && !loadingProviders && !err && (
              <ul className="space-y-3">
                {providers.map((p) => (
                  <ProviderCard key={p.id} p={p} />
                ))}

                {showDefaults && (
                  <li className="rounded-xl border border-border bg-bg-surface p-4 shadow-sm">
                    <div className="space-y-2">
                      <div className="font-medium text-text">Default options</div>
                      <ul className="space-y-2">
                        {fallbackProviders.map((p) => (
                          <ProviderCard key={`fallback-${p.id}`} p={p} />
                        ))}
                      </ul>
                      <div className="text-xs text-text-muted">
                        These are general entry points; availability varies by jurisdiction.
                      </div>
                    </div>
                  </li>
                )}

                {!providers.length && !fallbackProviders.length && (
                  <li className="rounded-xl border border-border bg-bg-surface p-4 text-sm text-text-muted">
                    No providers found.
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Step 3: What to expect */}
          <section
            aria-labelledby="what-to-expect"
            className="rounded-xl border border-border bg-bg-surface p-4 sm:p-5"
          >
            <h2 id="what-to-expect" className="text-xl font-semibold text-text">
              What to expect
            </h2>
            <ul className="mt-2 space-y-1 list-disc pl-5 text-text-muted">
              <li>Click a provider, follow their steps, and pay with a card or bank transfer.</li>
              <li>Most providers ask for ID to meet regulations (KYC).</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-bg-surface p-5 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-text">Ready for the next step?</h2>
            <p className="mt-2 text-sm text-text-muted">
              Once your ETH or stablecoins arrive, bridge them to PulseChain to start using the ecosystem.
            </p>
            <Link
              to="/bridge"
              className="mt-4 inline-flex w-full justify-center rounded-lg border border-primary bg-primary px-5 py-3 text-base font-semibold text-white transition-transform transition-colors duration-150 hover:-translate-y-0.5 hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto"
            >
              Go to PulseChain Bridge
            </Link>
            <div className="mt-3 text-sm text-text-muted">
              Need a wallet first?{" "}
              <Link to="/wallet" className="font-semibold text-primary hover:text-primary-600">
                Visit Wallet Guide
              </Link>
            </div>
          </section>

        </motion.div>
      </div>
    </div>
  );
}
