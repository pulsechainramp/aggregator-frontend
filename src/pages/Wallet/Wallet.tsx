import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import cryptosteelIcon from "../../assets/cryptosteel.png";
import internetMoneyIcon from "../../assets/internet-money.png";
import trezorIcon from "../../assets/trezor.png";
import useWallet from "../../hooks/useWallet";
import { PulseChainConfig, PulseChainWalletSetup } from "../../config/chainConfig";
import { requestAddChainToWallet } from "../../utils/walletUtils";

type WalletEntry = {
  name: string;
  description: string;
  href: string;
  icon: string;
  recommended?: boolean;
};

const DESKTOP_WALLETS: WalletEntry[] = [
  {
    name: "Internet Money",
    description: "Recommended for most new PulseChain users getting started.",
    href: "https://internetmoney.io/",
    icon: internetMoneyIcon,
    recommended: true,
  },
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
];

const MOBILE_WALLETS: WalletEntry[] = [
  {
    name: "Internet Money",
    description: "Recommended for most new PulseChain users getting started.",
    href: "https://internetmoney.io/",
    icon: internetMoneyIcon,
    recommended: true,
  },
  {
    name: "Rabby",
    description: "Secondary choice for users who already prefer Rabby.",
    href: "https://rabby.io/",
    icon: "/icons/rabby.svg",
  },
  {
    name: "MetaMask",
    description: "Popular mobile alternative if you already use MetaMask elsewhere.",
    href: "https://metamask.io/download/",
    icon: "/icons/metamask.svg",
  }
];

const HARDWARE_WALLETS: WalletEntry[] = [
  {
    name: "Trezor",
    description: "Hardware wallet for extra safety—store keys offline.",
    href: "https://trezor.io/store",
    icon: trezorIcon,
  },
  {
    name: "Cryptosteel",
    description: "Metal backup to protect your recovery phrase.",
    href: "https://cryptosteel.com/product/seed24",
    icon: cryptosteelIcon,
  },
];

type NetworkStatus = {
  tone: "success" | "warning" | "error";
  text: string;
};

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
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const { wallet } = useWallet();

  useEffect(() => {
    setIsMobile(detectMobileDevice());
  }, []);

  const wallets = isMobile ? MOBILE_WALLETS : DESKTOP_WALLETS;
  const pulsechainSettings = useMemo(
    () => [
      { label: "Network Name", value: PulseChainWalletSetup.chainName },
      { label: "RPC URL", value: PulseChainWalletSetup.rpcUrls[0] },
      { label: "Chain ID", value: PulseChainWalletSetup.chainId.toString() },
      { label: "Currency Symbol", value: PulseChainWalletSetup.nativeCurrency.symbol },
      { label: "Block Explorer URL", value: PulseChainWalletSetup.blockExplorerUrls[0] },
    ],
    []
  );

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const handleAddPulseChain = async () => {
    setIsAddingNetwork(true);
    setNetworkStatus(null);

    const result = await requestAddChainToWallet(PulseChainConfig.chainId, {
      provider: wallet?.provider as any,
    });

    if (result.ok) {
      setNetworkStatus({
        tone: "success",
        text: "PulseChain is available in your wallet.",
      });
      toast.success("PulseChain is available in your wallet");
      setIsAddingNetwork(false);
      return;
    }

    const statusByReason: Record<"no_provider" | "unsupported" | "failed", NetworkStatus> = {
      no_provider: {
        tone: "warning",
        text: "No compatible wallet was detected in this browser. Install a wallet first or use the manual setup button below.",
      },
      unsupported: {
        tone: "warning",
        text: "This wallet does not support one-click network setup. Use the manual setup button below.",
      },
      failed: {
        tone: "error",
        text: "We could not add PulseChain automatically. Use the manual setup button below.",
      },
    };

    if (result.reason === "rejected") {
      setIsAddingNetwork(false);
      return;
    }

    setNetworkStatus(statusByReason[result.reason]);
    if (result.reason === "failed") {
      toast.error("Could not add PulseChain automatically");
      setShowManualSetup(true);
    } else if (result.reason === "unsupported") {
      toast.info("Use the manual PulseChain settings below");
      setShowManualSetup(true);
    } else if (result.reason === "no_provider") {
      setShowManualSetup(true);
    }
    setIsAddingNetwork(false);
  };

  const renderWalletList = (list: WalletEntry[]) => (
    <ul className="mt-4 space-y-3">
      {list.map((wallet) => {
        const isRabby = wallet.icon.includes("rabby");
        const isRecommended = Boolean(wallet.recommended);

        return (
          <li
            key={wallet.name}
            className={`flex w-full flex-col gap-3 sm:gap-4 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              isRecommended
                ? "border border-primary bg-primary-050/40 shadow-floating"
                : "border border-border bg-bg-page/80"
            }`}
          >
            <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
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
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={wallet.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-text transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:truncate"
                  >
                    {wallet.name}
                  </a>
                  {isRecommended ? (
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Recommended
                    </span>
                  ) : null}
                </div>
                {wallet.description ? (
                  <p className={`mt-0.5 text-sm ${isRecommended ? "text-text" : "text-text-muted"}`}>
                    {wallet.description}
                  </p>
                ) : null}
              </div>
            </div>
            <a
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:ml-auto sm:w-auto sm:px-5 sm:py-3 sm:text-base sm:gap-3"
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
  );

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
          {renderWalletList(wallets)}
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">Add PulseChain Network</p>
            <h2 className="text-2xl font-bold text-text">Set up PulseChain in your wallet</h2>
            <p className="text-sm text-text-muted">
              Internet Money already supports PulseChain. If you use MetaMask, Rabby, or another EVM wallet, install the wallet first, then click the button below. If your wallet does not pop up, use Manual Setup below.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAddPulseChain}
              disabled={isAddingNetwork}
              className="inline-flex w-full items-center justify-center rounded-xl border border-primary bg-primary px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isAddingNetwork ? "Adding PulseChain..." : "Add PulseChain to My Wallet"}
            </button>
            <button
              type="button"
              onClick={() => setShowManualSetup((current) => !current)}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-bg-page px-5 py-3 text-base font-semibold text-text transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary sm:w-auto"
            >
              {showManualSetup ? "Hide Manual Setup" : "Show Manual Setup"}
            </button>
          </div>

          {networkStatus ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                networkStatus.tone === "success"
                  ? "border-success/30 bg-success/10 text-text"
                  : networkStatus.tone === "warning"
                  ? "border-warning/30 bg-warning/10 text-text"
                  : "border-danger/30 bg-danger/10 text-text"
              }`}
            >
              {networkStatus.text}
            </div>
          ) : null}

          {showManualSetup ? (
            <div className="rounded-2xl border border-border bg-bg-page/80 p-4">
              <p className="text-sm font-semibold text-text">Manual setup</p>
              <p className="mt-1 text-sm text-text-muted">
                If your wallet does not pop up, open your wallet, find <span className="font-medium text-text">Networks</span> or <span className="font-medium text-text">Add Custom Network</span>, then enter these details:
              </p>

              <div className="mt-4 space-y-3">
                {pulsechainSettings.map((entry) => (
                  <div
                    key={entry.label}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {entry.label}
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-text">{entry.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(entry.value, entry.label)}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-page px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary sm:ml-4 sm:w-auto"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-3xl border border-border bg-bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary">Hardware wallets</p>
            <p className="text-sm text-text-muted">
              Keep your keys offline and back them up securely.
            </p>
          </div>
          {renderWalletList(HARDWARE_WALLETS)}
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
