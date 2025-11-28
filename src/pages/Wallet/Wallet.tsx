import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type WalletEntry = {
  name: string;
  description: string;
  href: string;
  icon: string;
};

const DESKTOP_WALLETS: WalletEntry[] = [
  {
    name: "Rabby Wallet",
    description: "Secure browser extension for Chrome/Brave.",
    href: "https://rabby.io/",
    icon: "/icons/rabby.svg",
  },
  {
    name: "MetaMask",
    description: "Most popular Ethereum extension wallet.",
    href: "https://metamask.io/download/",
    icon: "/icons/metamask.svg",
  },
  {
    name: "Coinbase Wallet (Extension)",
    description: "Self-custody wallet from Coinbase.",
    href: "https://www.coinbase.com/wallet/downloads",
    icon: "/icons/coinbase.svg",
  },
];

const MOBILE_WALLETS: WalletEntry[] = [
  {
    name: "Rabby",
    description: "Pair to the Rabby extension via QR for mobile signing.",
    href: "https://rabby.io/mobile",
    icon: "/icons/rabby.svg",
  },
  {
    name: "MetaMask",
    description: "Swipe-friendly MetaMask app for Android and iOS.",
    href: "https://metamask.io/download/",
    icon: "/icons/metamask.svg",
  },
  {
    name: "Coinbase",
    description: "Mobile self-custody wallet with in-app browser.",
    href: "https://www.coinbase.com/wallet",
    icon: "/icons/coinbase.svg",
  },
];

const detectMobileDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const Wallet = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => detectMobileDevice());

  useEffect(() => {
    setIsMobile(detectMobileDevice());
  }, []);

  const wallets = isMobile ? MOBILE_WALLETS : DESKTOP_WALLETS;
  const deviceLabel = isMobile ? "mobile" : "desktop";

  return (
    <div className="bg-bg-page px-4 py-4 sm:py-10 text-text">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 sm:gap-8">
        <section className="space-y-3 rounded-3xl border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Wallet guide
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Your keys. Your PulseChain.
          </h1>
          <p className="text-base text-text-muted">
            Exchanges hold your funds. A self-custody wallet puts you in charge, so you can bridge, swap, and sign
            transactions safely.
          </p>
          <p className="text-xs text-text-muted hidden">
            Install, back up your recovery phrase, and only bridge from wallets you control.
          </p>
        </section>

        <section className="space-y-3 rounded-3xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary">
              Recommended wallets
            </p>
            <p className="text-sm text-text-muted hidden">
              After installing, make sure to back up your recovery phrase.
            </p>
          </div>
          <ul className="mt-4 space-y-3">
            {wallets.map((wallet) => {
              const isRabby = wallet.icon.includes("rabby");

              return (
                <li
                  key={wallet.name}
                  className="flex w-full items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-border bg-bg-page/80 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div
                      className={`flex ${isRabby ? "h-12 w-12 min-w-[3rem] sm:h-10 sm:w-10 sm:min-w-[2.5rem]" : "h-10 w-10 min-w-[2.5rem] sm:h-9 sm:w-9 sm:min-w-[2.25rem]"} items-center justify-center rounded-full bg-primary/10`}
                    >
                      {wallet.icon ? (
                        <img
                          src={wallet.icon}
                          alt={`${wallet.name} icon`}
                          className={`object-contain ${isRabby ? "h-11 w-11 sm:h-9 sm:w-9" : "h-8 w-8 sm:h-6 sm:w-6"}`}
                          loading="lazy"
                        />
                      ) : (
                        <span className="font-semibold text-primary">{wallet.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={wallet.href}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-semibold text-text transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {wallet.name}
                      </a>
                    </div>
                  </div>
                  <a
                    className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:px-5 sm:py-3 sm:text-base sm:gap-3"
                    href={wallet.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit
                    <span aria-hidden="true" className="text-lg">
                      &rarr;
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Keep moving
            </p>
            <h2 className="text-2xl font-bold text-text">What to do after your wallet is ready</h2>
            <p className="mt-1 text-sm text-text-muted">
              Once your wallet is set up, continue by buying ETH, sending it to your wallet and then bridging it onto PulseChain.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/onramp"
              className="inline-flex w-full items-center justify-center rounded-xl border border-primary bg-primary px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-1/2"
            >
              Go to Onramp
            </Link>
            <Link
              to="/bridge"
              className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-bg-page px-5 py-3 text-base font-semibold text-text transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-1/2"
            >
              Go to Bridge
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Wallet;
