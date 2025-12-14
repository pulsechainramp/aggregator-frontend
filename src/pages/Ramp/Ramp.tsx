import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

const CONTRACT_ADDRESS = "0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2";
const DEXSCREENER_URL =
  "https://dexscreener.com/pulsechain/0x04dc9b9b094537ab1d50003263a8b247355051b6";
const TRADE_URL =
  "https://ipfs.app.pulsex.com/?inputCurrency=0xA1077a294dDE1B09bB078844df40758a5D0f9a27&outputCurrency=0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2"
const PUMP_TIRES_URL =
  "https://pump.tires/token/0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2";
const APP_URL = "https://PulseChainRamp.com";
const REFERRALS_URL = `${APP_URL}/referrals`;
const EXPLORER_URL =
  "https://scan.mypinata.cloud/ipfs/bafybeienxyoyrhn5twsclwd3gdjy5mtkkwmu37aqtml6onbf7xnb3o22pe/#/token/0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2"; // TODO: replace ... with full link

const ContractAddress = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy contract address", error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs break-all text-text">
        {CONTRACT_ADDRESS}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-page px-2 py-1 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label="Copy contract address"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy
          </>
        )}
      </button>
    </div>
  );
};

type QuickFact = {
  label: string;
  value: ReactNode;
};

const QUICK_FACTS: QuickFact[] = [
  { label: "Chain", value: "PulseChain (PRC-20)" },
  { label: "Ticker / Name", value: "RAMP" },
  { label: "Total supply", value: "1,000,000,000 RAMP (fixed)" },
  {
    label: "Contract",
    value: <ContractAddress />,
  },
  {
    label: "Primary pair",
    value: (
      <a
        href={DEXSCREENER_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
      >
        RAMP / PLS on PulseX (chart)
      </a>
    ),
  },
  {
    label: "Launch",
    value: "pump.tires fair launch; LP locked on PulseX with no admin keys",
  },
];

const Ramp = () => {
  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="space-y-6 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm md:flex md:items-center md:justify-between">
          <div className="space-y-3 md:max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              RAMP Token
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              RAMP — the PulseChainRamp community token
            </h1>
            <p className="max-w-3xl text-sm text-text-muted sm:text-base">
              RAMP is the token linked to PulseChainRamp.com, a guided flow that
              helps people get a wallet, bridge in, and swap on PulseChain. The
              long‑term design is to route a small share of that app volume into
              buying RAMP on PulseX and burning it, reducing supply over time.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={APP_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              >
                Open PulseChainRamp
              </a>
              <a
                href={REFERRALS_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-lg border border-border bg-bg-raised px-4 py-2 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              >
                Referral dashboard
              </a>
              <a
                href={TRADE_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              >
                Buy RAMP on PulseX
              </a>
            </div>
          </div>

          {/* Token card with logo */}
          <div className="mt-6 flex justify-center md:ml-8 md:mt-0">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg-raised px-6 py-4 shadow-inner">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border/70 bg-white p-3 shadow-sm">
                <img
                  src="/logo.png"
                  alt="RAMP token logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="text-sm font-semibold">RAMP • PRC‑20</p>
              <p className="text-xs text-text-muted">
                1,000,000,000 fixed supply
              </p>
              <p className="text-xs text-text-muted">
                Designed to track PulseChainRamp volume over time
              </p>
            </div>
          </div>
        </section>

        {/* Quick facts */}
        <section className="space-y-4 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-text">Quick facts</h2>
            <p className="text-sm text-text-muted">Key details at a glance.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {QUICK_FACTS.map((fact) => (
              <article
                key={fact.label}
                className="space-y-1 rounded-xl border border-border bg-bg-raised p-4 shadow-inner"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {fact.label}
                </p>
                <p className="text-sm text-text">{fact.value}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Why RAMP exists */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Why RAMP exists</h2>
          <p className="text-sm text-text-muted">
            RAMP links the PulseChainRamp onboarding app with the community that
            uses and improves it.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-text">
            <li>
              Align the community with PulseChainRamp&apos;s growth and trading
              volume.
            </li>
            <li>
              Reward testers, early users, and{" "}
              <span className="font-semibold">referrers</span> who push real
              traffic through the app.
            </li>
            <li>
              Give the community a token that may benefit from future buy &amp;
              burn.
            </li>
          </ul>
        </section>

        {/* Earn referral fees */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">
            Earn referral fees by onboarding users
          </h2>
          <p className="text-sm text-text-muted">
            PulseChainRamp is built around referrals. Share a link, and when
            people run the guided flow (wallet, bridge, swap), the protocol can
            share a portion of fees with the referrer.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-text">
            <li>
              Invite friends or your audience to use PulseChainRamp instead of
              figuring everything out alone.
            </li>
            <li>
              They get a simpler setup; <span className="font-semibold">you can earn up to 3% referral fees</span> from the
              volume they route through the app.
            </li>
            <li>
              Once buy &amp; burn is live, that same volume is designed to help
              buy and burn RAMP from the open market.
            </li>
          </ul>
          <div className="mt-3">
            <a
              href={REFERRALS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
            >
              Go to referrals
            </a>
          </div>
        </section>

        {/* Buy & burn focus */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">
            Planned buy &amp; burn (NOT live yet)
          </h2>
          <p className="text-sm text-text-muted">
            <span className="font-semibold">Design goal:</span> route
            up to <span className="font-semibold">0.5% of future trading</span>{" "}
            volume generated through PulseChainRamp into buying RAMP on PulseX
            and sending it to a burn address.
          </p>

          <div className="rounded-xl border border-border bg-bg-raised p-4">
            <p className="mb-3 text-sm font-semibold text-text">
              Buy pressure at different volume levels (0.5% allocation,
              examples):
            </p>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-surface p-3 text-center">
                <p className="text-xs text-text-muted">Yearly volume</p>
                <p className="text-base font-semibold">$1M</p>
                <p className="text-xs text-text-muted">
                  ≈ <span className="font-semibold">$5k</span>/year buy &amp;
                  burn
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg-surface p-3 text-center">
                <p className="text-xs text-text-muted">Yearly volume</p>
                <p className="text-base font-semibold">$10M</p>
                <p className="text-xs text-text-muted">
                  ≈ <span className="font-semibold">$50k</span>/year buy &amp;
                  burn
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg-surface p-3 text-center">
                <p className="text-xs text-text-muted">Yearly volume</p>
                <p className="text-base font-semibold">$100M</p>
                <p className="text-xs text-text-muted">
                  ≈{" "}
                  <span className="font-semibold">$500k</span>
                  /year buy &amp; burn
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              These are simple examples, not predictions. Real volume, fee
              splits, and any impact on price depend entirely on actual usage of
              PulseChainRamp and future decisions.
            </p>
          </div>

          <p className="text-xs font-semibold text-danger">
            Buy &amp; burn is not live yet and may change or never launch. This
            is <span className="underline">not</span> a promise of profit.
          </p>
        </section>

        {/* How to get RAMP */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">How to get RAMP</h2>
          <p className="text-sm text-text-muted">
            Before buying RAMP, you may want to try PulseChainRamp yourself with
            a small test swap.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text">
            <li>Get PLS on PulseChain for gas and swaps.</li>
            <li>
              Open the official RAMP / PLS pool on PulseX and start a swap:&nbsp;
              <a
                href={TRADE_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline underline-offset-2 hover:text-primary-600"
              >
                trade RAMP on PulseX
              </a>
              .
              <span className="block text-xs text-text-muted">
                Optional: check price and liquidity first on{" "}
                <a
                  href={DEXSCREENER_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline underline-offset-2 hover:text-primary-600"
                >
                  DexScreener
                </a>
                .
              </span>
            </li>
            <li>
              Double‑check the token address matches{" "}
              <span className="font-mono text-xs break-all align-middle">
                {CONTRACT_ADDRESS}
              </span>{" "}
              before confirming any swap.
            </li>
            <li>Start with a small test swap before using larger sizes.</li>
          </ol>
        </section>

        {/* Risks */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Risks</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-text">
            <li>High volatility; you can lose most or all of your money.</li>
            <li>
              RAMP is a high‑risk community token with no guarantee of future
              development, volumes, or buy &amp; burn.
            </li>
            <li>Market and liquidity risk, especially on larger trades.</li>
          </ul>
          <p className="text-xs font-semibold text-danger">
            Never risk more than you can afford to lose. Nothing here is
            financial, tax, or legal advice.
          </p>
        </section>

        {/* Official links */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Official links</h2>
          <div className="space-y-2 text-sm">
            <a
              href={APP_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              PulseChainRamp.com homepage
            </a>
            <a
              href={DEXSCREENER_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              RAMP / PLS chart (DexScreener)
            </a>
            <a
              href={PUMP_TIRES_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              pump.tires launch page
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Ramp;
