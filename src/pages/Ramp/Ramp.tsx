import { useState, type ReactNode } from "react";

const CONTRACT_ADDRESS = "0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2";
const DEXSCREENER_URL = "https://dexscreener.com/pulsechain/0x04dc9b9b094537ab1d50003263a8b247355051b6";
const TRADE_URL =
  "https://ipfs.app.pulsex.com/?inputCurrency=0xA1077a294dDE1B09bB078844df40758a5D0f9a27&outputCurrency=0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2";
const PUMP_TIRES_URL = "https://pump.tires/token/0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2";
const APP_URL = "https://PulseChainRamp.com";
const EXPLORER_URL =
  "https://scan.mypinata.cloud/ipfs/bafybeienxyoyrhn5twsclwd3gdjy5mtkkwmu37aqtml6onbf7xnb3o22pe/#/token/0x3Cf6457Ef1De6b208854aa1705bBDe54061B84f2";
const COPY_BUTTON_CLASS =
  "inline-flex items-center rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type QuickFact = {
  label: string;
  value: ReactNode;
};

const Ramp = () => {
  const [copied, setCopied] = useState(false);

  const copyContract = async () => {
    try {
      if ("clipboard" in navigator && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = CONTRACT_ADDRESS;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const QUICK_FACTS: QuickFact[] = [
    { label: "Chain", value: "PulseChain (PRC-20)" },
    { label: "Ticker / Name", value: "RAMP" },
    { label: "Total supply", value: "1,000,000,000 RAMP" },
    {
      label: "Contract",
      value: (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs break-all text-text">{CONTRACT_ADDRESS}</span>
          <button
            type="button"
            onClick={copyContract}
            className={COPY_BUTTON_CLASS}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ),
    },
    {
      label: "Where to trade",
      value: (
        <a
          href={TRADE_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
        >
          RAMP / PLS on PulseX
        </a>
      ),
    },
    {
      label: "Price Chart",
      value: (
        <a
          href={DEXSCREENER_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
        >
          DexScreener
        </a>
      ),
    },
    { label: "Launch", value: "pump.tires fair launch; LP locked on PulseX with no admin keys" },
  ];

  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Hero */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">RAMP Token</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            RAMP: PulseChainRamp.com token with a planned buy &amp; burn engine
          </h1>
          <p className="max-w-3xl text-text-muted text-sm sm:text-base">
            RAMP is the community token for PulseChainRamp.com, the guided flow for wallets, bridging, and swapping on
            PulseChain. Long-term, the goal is to route a slice of app volume into buying RAMP on PulseX and burning it.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={TRADE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-600"
            >
              Buy RAMP on PulseX
            </a>
            <a
              href={DEXSCREENER_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-primary underline underline-offset-2 hover:text-primary-600"
            >
              View chart
            </a>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{fact.label}</p>
                <p className="text-sm text-text">{fact.value}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Buy & burn focus section */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Planned buy &amp; burn (NOT live yet)</h2>
          <p className="text-sm text-text-muted">
            Target design: route up to <span className="font-semibold">0.5% of future trading volume</span> generated
            through PulseChainRamp into buying RAMP on PulseX and sending it to a burn address.
          </p>

          <div className="rounded-xl border border-border bg-bg-raised p-4 text-sm">
            <p className="mb-2 font-semibold text-text">Buy pressure at different volume levels (examples):</p>
            <ul className="space-y-1 pl-4 list-disc text-text">
              <li>$1M yearly volume ~<span className="font-semibold">$5,000</span>/year</li>
              <li>$10M yearly volume ~<span className="font-semibold">$50,000</span>/year</li>
              <li>$100M yearly volume ~<span className="font-semibold">$500,000</span>/year</li>
            </ul>
            <p className="mt-3 text-xs text-text-muted">
              These are hypothetical scenarios, not predictions. Actual volume, fee allocation, and impact on price will
              depend entirely on real usage of PulseChainRamp and future decisions.
            </p>
          </div>

          <p className="text-xs font-semibold text-danger">
            Buy &amp; burn is not live yet and may change over time. This is not a promise of profit.
          </p>
        </section>

        {/* Why RAMP exists */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Why RAMP exists</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-text">
            <li>Align the community with PulseChainRamp&apos;s growth and volume.</li>
            <li>Reward testers, early users, and referrers who push real traffic through the app.</li>
            <li>High-risk community token with no guarantee of future features or value.</li>
          </ul>
        </section>

        {/* How to get RAMP */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-text">How to get RAMP</h2>
        <p className="text-sm text-text-muted">Basic steps to buy RAMP on PulseChain.</p>
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
              Optional: check price and liquidity first on&nbsp;
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
            Double-check the token address matches{" "}
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
            <li>Extreme volatility; you can lose most or all of your money.</li>
            <li>No guarantee that buy &amp; burn, volumes, or any roadmap items will ship.</li>
            <li>Market and liquidity risk, especially for larger positions.</li>
          </ul>
          <p className="text-xs font-semibold text-danger">
            Never risk more than you can afford to lose. Nothing here is financial, tax, or legal advice.
          </p>
        </section>

        {/* Official links */}
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Official links</h2>
          <div className="space-y-2 text-sm">
            <a
              href={TRADE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              Buy RAMP (PulseX)
            </a>
            <a
              href={DEXSCREENER_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              Price Chart (DexScreener)
            </a>
            <a
              href={PUMP_TIRES_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              pump.tires launch
            </a>
            <a
              href="https://t.me/PulseChainRamp"
              target="_blank"
              rel="noreferrer noopener"
              className="block text-primary underline underline-offset-2 transition-colors hover:text-primary-600"
            >
              Telegram chat group
            </a>
            
          </div>
        </section>
      </div>
    </div>
  );
};

export default Ramp;


