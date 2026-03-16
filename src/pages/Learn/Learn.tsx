import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LearnCard = {
  title: string;
  summary: ReactNode;
  logo: string;
};

const CARDS: LearnCard[] = [
  {
    title: "PulseChain (PLS)",
    summary: (
      <>
        PulseChain is a blockchain, similar to Ethereum, but built to be faster and cheaper to use. It uses a coin
        called PLS to pay small network fees whenever you send, swap, or use apps. Learn more at{" "}
        <a
          href="https://pulsechain.com"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          PulseChain.com
        </a>
        .
      </>
    ),
    logo: "/token-logos/pulsex/369/0x0000000000000000000000000000000000000000.png",
  },
  {
    title: "PLSX (PulseX token)",
    summary: (
      <>
        PLSX is the token for PulseX, the main trading app (exchange) on PulseChain. You'll often see it when swapping
        tokens or using features that reward people for helping the exchange run. Learn more at{" "}
        <a
          href="https://pulsex.com"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          PulseX.com
        </a>
        .
      </>
    ),
    logo: "/token-logos/pulsex/369/0x95B303987A60C71504D99Aa1b13B4DA07b0790ab.png",
  },
  {
    title: "INC (reward token)",
    summary: "INC is a bonus token you can earn when you put pairs of tokens into special earning pools on PulseX. These pools help other people trade, and INC is given as an extra “thank you” reward.",
    logo: "/token-logos/pulsex/369/0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d.png",
  },
  {
    title: "HEX (time-locked savings)",
    summary: (
      <>
        HEX is a token you can lock for a set period of time, similar to a fixed-term savings account. If you wait until the end of the lock period, you can earn extra HEX as a reward; ending early can mean penalties. Learn more at{" "}
        <a
          href="https://hex.com"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          HEX.com
        </a>
        .
      </>
    ),
    logo: "/token-logos/pulsex/369/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39.png",
  },
  {
    title: "ProveX (burn-only token)",
    summary: (
      <>
        ProveX is a future token for "no middleman" trading. Instead of paying an exchange, buyers
        and sellers trade directly, and each use is designed to buy and burn ProveX, shrinking
        supply over time. Learn more at{" "}
        <a
          href="https://ProveX.com"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          ProveX.com
        </a>
        .
      </>
    ),
    logo: "/icons/provex.png",
  },
];

const Learn = () => {
  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Learn
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Learn the basics, fast.
          </h1>
          <p className="max-w-2xl text-text-muted">
            One short page to explain PulseChain, its main coins, and why people use it.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {CARDS.map((card) => (
              <article
                key={card.title}
                className="flex items-center gap-4 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"
              >
                <img
                  src={card.logo}
                  alt={`${card.title} logo`}
                  className="h-12 w-12 flex-none rounded-full border border-border bg-bg-raised object-contain p-1"
                  loading="lazy"
                />
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-text">{card.title}</h2>
                  <p className="text-sm leading-relaxed text-text-muted">{card.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-3 rounded-2xl border border-primary/30 bg-primary-050/70 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-primary">Why use PulseChain?</h2>
          <ul className="list-disc space-y-2 pl-5 text-text">
            <li>Pay much lower network fees than on Ethereum </li>
            <li>Faster confirmations so your swaps and sends complete more quickly</li>
            <li>If you’ve used Ethereum before, the wallets and tools feel very familiar</li>
          </ul>
          <Link
            to="/start"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back to Getting Started
          </Link>
        </section>
      </div>
    </div>
  );
};

export default Learn;
