import React from "react";

type JumpLink = {
  label: string;
  href: string;
};

type OverviewCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  logo: string;
};

const JUMP_LINKS: JumpLink[] = [
  { label: "Overview", href: "#overview" },
  { label: "Farming", href: "#farming" },
  { label: "PLS staking", href: "#pls-staking" },
  { label: "HEX staking", href: "#hex-staking" },
];

const LOGOS = {
  pls: "/token-logos/pulsex/369/0x0000000000000000000000000000000000000000.png",
  plsx: "/token-logos/pulsex/369/0x95B303987A60C71504D99Aa1b13B4DA07b0790ab.png",
  inc: "/token-logos/pulsex/369/0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d.png",
  hex: "/token-logos/pulsex/369/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39.png",
};

const OVERVIEW_CARDS: OverviewCard[] = [
  {
    title: "I hold PLS",
    description:
      "Simple option: stake PLS with a validator to help run the network and earn rewards, or (for advanced users) use PLS in farming pools.",
    href: "#pls-staking",
    cta: "Jump to PLS staking",
    logo: LOGOS.pls,
  },
  {
    title: "I hold PLSX",
    description:
      "Main option: use PLSX in farming pools on PulseX to earn rewards, including possible INC. This is more advanced and values can move around a lot.",
    href: "#farming",
    cta: "Jump to Farming",
    logo: LOGOS.plsx,
  },
  {
    title: "I hold HEX",
    description:
      "Main option: time-lock (stake) HEX for a period you choose to try to earn more HEX at the end. Ending early can cause penalties.",
    href: "#hex-staking",
    cta: "Jump to HEX staking",
    logo: LOGOS.hex,
  },
];

const FARM_RANGE = "up to 9% APY";
const PLS_STAKING_APY = "up to 10% APY";
const HEX_STAKING_APY = "up to 5% APY";

const Earn = () => {
  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <header className="space-y-3 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Earn</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Earn on PulseChain</h1>
          <p className="max-w-3xl text-text-muted">
            See the main ways people earn up to <b>10% APY (Annual Percentage Yield)</b> with their tokens: farming, PLS staking, and HEX time-locking.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {JUMP_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg border border-border bg-bg-raised px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {link.label}
              </a>
            ))}
          </div>
        </header>

        <section id="overview" className="space-y-4 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text">Where should I start?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {OVERVIEW_CARDS.map((card) => (
              <article
                key={card.title}
                className="flex h-full flex-col gap-3 rounded-xl border border-border bg-bg-raised p-4 shadow-inner"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={card.logo}
                    alt={`${card.title} logo`}
                    className="h-10 w-10 flex-none rounded-full border border-border bg-bg-surface object-contain p-1"
                    loading="lazy"
                  />
                  <p className="text-sm font-semibold text-text">{card.title}</p>
                </div>
                <div>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{card.description}</p>
                </div>
                <a
                  href={card.href}
                  className="inline-flex w-fit items-center justify-center rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {card.cta}
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="farming" className="space-y-4 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={LOGOS.plsx}
                alt="PLSX logo"
                className="h-10 w-10 rounded-full border border-border bg-bg-surface object-contain p-1"
                loading="lazy"
              />
              <img
                src={LOGOS.inc}
                alt="INC logo"
                className="h-10 w-10 rounded-full border border-border bg-bg-surface object-contain p-1"
                loading="lazy"
              />
              <h2 className="text-xl font-semibold text-text">Farming (advanced)</h2>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Farming means putting two tokens together as a pair into a trading pool on PulseX so other people can swap
              between them. In return you can earn a share of trading fees and sometimes extra bonus tokens like INC.
              This can pay attractive rewards, but the value of your tokens can move up or down compared to just holding
              them.
            </p>
            <p className="text-xs font-semibold text-text-muted">
              APY is a simple way to show the yearly rate of return if rewards stayed the same for a full year.
            </p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary-050/70 p-4 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-primary">Potential rewards</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/60 bg-white/90 px-3 py-1 text-base font-bold text-primary shadow-sm">
              <span aria-hidden="true">▲</span>
              <span>{FARM_RANGE}</span>
            </div>
            <p className="mt-2 text-sm text-text">
              These numbers move up and down constantly and are not guaranteed.
            </p>
          </div>
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Farming is higher risk. If one token in the pair changes a lot in price, you can end up with less value than if you had simply held the two tokens separately.
          </div>
          <a
            href="https://app.pulsex.com/#/farms"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Open farming interface
          </a>
        </section>

        <section id="pls-staking" className="space-y-4 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={LOGOS.pls}
                alt="PLS logo"
                className="h-10 w-10 rounded-full border border-border bg-bg-surface object-contain p-1"
                loading="lazy"
              />
              <h2 className="text-xl font-semibold text-text">PLS staking (support the network)</h2>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Staking PLS means you point your PLS at a validator, which is a computer that helps run the PulseChain
              network. While your PLS is staked, the validator does the work and you can earn a share of the rewards they
              receive. You keep ownership of your coins, but they may be locked or have a delay before you can unstake.
            </p>
          </div>
          <div className="rounded-xl border border-primary/50 bg-primary-050/70 p-4 shadow-sm">
            <p className="text-sm font-semibold text-primary">Potential rewards</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/60 bg-white/90 px-3 py-1 text-base font-bold text-primary shadow-sm">
              <span aria-hidden="true">▲</span>
              <span>{PLS_STAKING_APY}</span>
            </div>
            <p className="mt-2 text-sm text-text">
              Estimates move with network conditions and validator performance.
            </p>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text">
            <li>Choose a validator with good uptime and a fee you are comfortable with.</li>
            <li>Stake (delegate) your PLS to that validator using the staking interface.</li>
            <li>Check back from time to time to claim rewards or move to a different validator if you want.</li>
          </ol>
          <p className="text-xs font-semibold text-text-muted">
            Estimated returns change over time. There is also risk if a validator misbehaves or the rules of the network change.
          </p>
          <a
            href="https://launchpad.pulsechain.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Go to PLS staking
          </a>
        </section>

        <section id="hex-staking" className="space-y-4 rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={LOGOS.hex}
                alt="HEX logo"
                className="h-10 w-10 rounded-full border border-border bg-bg-surface object-contain p-1"
                loading="lazy"
              />
              <h2 className="text-xl font-semibold text-text">HEX staking (time-locked saving)</h2>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              HEX staking is like a fixed-term savings plan. You choose how long to lock your HEX, and if you leave it
              locked until the end, the system can reward you with extra HEX. Longer and larger stakes can earn more, but
              you must be comfortable not touching that HEX for the full time you choose.
            </p>
          </div>
          <div className="rounded-xl border border-primary/50 bg-primary-050/70 p-4 shadow-sm">
            <p className="text-sm font-semibold text-primary">Potential rewards</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/60 bg-white/90 px-3 py-1 text-base font-bold text-primary shadow-sm">
              <span aria-hidden="true">▲</span>
              <span>{HEX_STAKING_APY}</span>
            </div>
            <p className="mt-2 text-sm text-text">
              Actual outcomes depend on your lock length and when you end the stake.
            </p>
          </div>
          <div className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm text-danger font-semibold">
            Important: Ending a HEX stake early can mean heavy penalties. Only stake the amount you are willing to lock until the full end date.
          </div>
          <a
            href="https://go.hex.com/stake"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Open HEX staking
          </a>
        </section>

        <p className="text-center text-xs font-semibold text-text-muted">
          Nothing here is financial advice. Rewards and risks can change quickly. Always do your own research.
        </p>
      </div>
    </div>
  );
};

export default Earn;
