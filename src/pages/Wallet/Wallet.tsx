import { useEffect, useState } from "react";

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
    name: "Rabby Mobile",
    description: "Pair to the Rabby extension via QR for mobile signing.",
    href: "https://rabby.io/mobile",
    icon: "/icons/rabby.svg",
  },
  {
    name: "MetaMask Mobile",
    description: "Swipe-friendly MetaMask app for Android and iOS.",
    href: "https://metamask.io/download/",
    icon: "/icons/metamask.svg",
  },
  {
    name: "Coinbase Wallet App",
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
    <div className="bg-bg-page px-4 py-10 text-text">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="space-y-3 rounded-3xl border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Wallet guide
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Your keys. Your PulseChain journey.
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
            {wallets.map((wallet) => (
              <li
                key={wallet.name}
                className="flex items-center justify-between rounded-2xl border border-border bg-bg-page/80 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {wallet.icon ? (
                      <img
                        src={wallet.icon}
                        alt={`${wallet.name} icon`}
                        className={`object-contain ${
                          wallet.icon.includes("rabby") ? "h-12 w-12" : "h-8 w-8"
                        }`}
                        loading="lazy"
                      />
                    ) : (
                      <span className="font-semibold text-primary">{wallet.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-text">{wallet.name}</p>
                    <p className="text-sm text-text-muted">{wallet.description}</p>
                  </div>
                </div>
                <a
                  href={wallet.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 rounded-xl border border-primary bg-primary px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Visit site
                  <span aria-hidden="true" className="text-lg">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Wallet;
