import React, { useEffect, useState } from "react";
import { fetchGeo, fetchProviders, Provider } from "../../api/onramps";
import CountrySelect from "./CountrySelect";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { resolveProviderLink } from "../../utils/onrampLinks";

type Props = {
  open: boolean;
  onClose: () => void;
  address?: string;
};

const COUNTRY_DEFAULT = "US";
const FALLBACK_COUNTRY = "ZZ";
const DEFAULT_AMOUNT = "200";

const getFiatFor = (code: string) =>
  COUNTRY_OPTIONS.find((option) => option.code === code)?.fiat ?? "USD";

const paymentSummary = (provider: Provider) =>
  (provider.supported_payment_methods || []).join(" / ") || provider.type;

export default function OnRampModal({ open, onClose, address }: Props) {
  const [country, setCountry] = useState<string>(COUNTRY_DEFAULT);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [fallbackProviders, setFallbackProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const geo = await fetchGeo();
        if (!cancelled && geo.country) {
          setCountry((geo.country || COUNTRY_DEFAULT).toUpperCase());
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to detect country");
          setCountry(FALLBACK_COUNTRY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const clearProviders = () => {
    setProviders([]);
    setFallbackProviders([]);
    setError(null);
  };

  const loadProviders = async (nextCountry: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchProviders({
        country: nextCountry || COUNTRY_DEFAULT,
        address,
        amount: DEFAULT_AMOUNT,
        fiat: getFiatFor(nextCountry || COUNTRY_DEFAULT),
      });
      setProviders(response.providers || []);
      setFallbackProviders(response.fallback_provider_details || []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load providers");
      setProviders([]);
      setFallbackProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    clearProviders();
    loadProviders(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, country, address]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />

      <div className="relative z-10 mt-20 w-[92vw] max-w-xl max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-bg-surface p-5 shadow-floating sm:mt-0 sm:max-h-[85vh] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">Buy Ethereum (ETH)</h3>
          <button
            onClick={onClose}
            className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-text-muted transition-colors hover:bg-primary-050 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label="Close on-ramp modal"
          >
            {"\u00d7"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="onramp-modal-country" className="text-sm font-medium text-text-muted">
            Country
          </label>
          <CountrySelect
            id="onramp-modal-country"
            value={country}
            onChange={(code) => setCountry(code.toUpperCase())}
          />
          <span className="text-xs text-text-muted">
            Providers refresh automatically when you change your country.
          </span>
        </div>

        {loading && (
          <div className="py-6 text-center text-text-muted">Loading providers...</div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && (
          <ul className="space-y-3">
            {providers.map((provider) => {
              const { href, blocked } = resolveProviderLink(provider);
              const isDisabled = !href;
              const prefersPrimary = Boolean(provider.deeplink && href);
              const buttonBase =
                "touch-target inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
              const buttonStyle = prefersPrimary
                ? "border-primary bg-primary text-white hover:border-primary-600 hover:bg-primary-600 hover:text-white focus-visible:text-white active:text-white hover:underline"
                : "border-border bg-bg-surface text-text hover:border-primary hover:text-text focus-visible:text-text active:text-text hover:underline";
              const disabledStyle = isDisabled
                ? "pointer-events-none cursor-not-allowed opacity-60 hover:border-border hover:text-text"
                : "";

              return (
                <li
                  key={provider.id}
                  className="rounded-xl border border-border bg-bg-raised p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-text">{provider.display_name}</div>
                      <div className="text-xs text-text-muted">
                        {paymentSummary(provider)}
                      </div>
                    </div>
                    <a
                      href={href ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={isDisabled}
                      title={
                        isDisabled
                          ? "Provider link unavailable. Contact support for details."
                          : undefined
                      }
                      className={`${buttonBase} ${buttonStyle} ${disabledStyle}`}
                      onClick={(event) => {
                        if (isDisabled) {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                    >
                      {isDisabled ? "Link unavailable" : "Continue"}
                    </a>
                  </div>
                  {blocked && (
                    <p className="mt-2 text-xs text-danger">
                      Provider link was blocked because it used an invalid or unsafe URL scheme.
                    </p>
                  )}
                </li>
              );
            })}

            {fallbackProviders.length > 0 && (
              <li className="rounded-xl border border-border bg-bg-raised p-4 shadow-sm">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-text">
                    Default options
                  </div>
                  <ul className="space-y-2">
                    {fallbackProviders.map((provider) => {
                      const { href, blocked } = resolveProviderLink(provider);
                      const isDisabled = !href;

                      return (
                        <li
                          key={`fallback-${provider.id}`}
                          className="rounded-lg border border-border bg-bg-surface p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="font-medium text-text">
                                {provider.display_name}
                              </div>
                              <div className="text-xs text-text-muted">
                                {paymentSummary(provider)}
                              </div>
                            </div>
                            <a
                              href={href ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              aria-disabled={isDisabled}
                              className={`touch-target inline-flex items-center justify-center rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${isDisabled
                                ? "pointer-events-none cursor-not-allowed opacity-60"
                                : "hover:border-primary hover:text-primary hover:underline"
                                }`}
                              onClick={(event) => {
                                if (isDisabled) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }
                              }}
                            >
                              {isDisabled ? "Link unavailable" : "Visit"}
                            </a>
                          </div>
                          {blocked && (
                            <p className="mt-2 text-xs text-danger">
                              Provider link was blocked because it used an invalid or unsafe URL scheme.
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-text-muted">
                    These providers typically support a broad set of countries. Coverage still varies by jurisdiction.
                  </p>
                </div>
              </li>
            )}

            {!providers.length && !fallbackProviders.length && (
              <li className="rounded-xl border border-border bg-bg-raised p-4 text-sm text-text-muted">
                No providers found for {country}. Try a different 2-letter code
                such as <span className="font-semibold text-text">US</span>,{" "}
                <span className="font-semibold text-text">GB</span>, or{" "}
                <span className="font-semibold text-text">DE</span>.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
