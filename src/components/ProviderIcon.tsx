import React, { useEffect, useMemo, useState } from "react";
import { Wallet, Plus } from "lucide-react";

export type EIP1193 = {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  selected?: boolean;
  request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (ev: string, fn: (...a: any[]) => void) => void;
  removeListener?: (ev: string, fn: (...a: any[]) => void) => void;
};

type Brand = "metamask" | "coinbase" | "rabby" | "neutral";
type Props = {
  provider?: EIP1193 | null;
  className?: string;
  forceNeutral?: boolean;
  showPlus?: boolean;
  size?: number;
};

const ICONS: Record<Exclude<Brand, "neutral">, string> = {
  metamask: "/icons/metamask.svg",
  coinbase: "/icons/coinbase.svg",
  rabby: "/icons/rabby.svg",
};

type Announced = { provider: EIP1193; rdns?: string };

function unwrap(p?: any): EIP1193 | undefined {
  // Some libs nest the real injected provider under `.provider` or `.ethereum`
  return (p?.provider || p?.ethereum || p) as EIP1193 | undefined;
}

function brandFromFlags(p?: EIP1193 | null): Exclude<Brand, "neutral"> | null {
  if (!p) return null;
  // IMPORTANT: Rabby first (Rabby often also sets isMetaMask for compatibility)
  if ((p as any).isRabby) return "rabby";
  if ((p as any).isCoinbaseWallet) return "coinbase";
  if ((p as any).isMetaMask) return "metamask";
  return null;
}

function brandFromRdns(rdns?: string): Exclude<Brand, "neutral"> | null {
  if (!rdns) return null;
  if (rdns.includes("io.rabby")) return "rabby";
  if (rdns.includes("coinbase")) return "coinbase";
  if (rdns.includes("io.metamask")) return "metamask";
  return null;
}

function getInjectedPool(): EIP1193[] {
  if (typeof window === "undefined") return [];
  const eth: any = (window as any).ethereum;
  if (!eth) return [];
  const providers: any[] | undefined = Array.isArray(eth.providers) ? eth.providers : undefined;
  return (providers && providers.length ? providers : [eth]).map(unwrap).filter(Boolean) as EIP1193[];
}

async function hasAccounts(p?: EIP1193): Promise<boolean> {
  if (!p?.request) return false;
  try {
    const accs = await Promise.race([
      p.request({ method: "eth_accounts" }) as Promise<any>,
      new Promise((r) => setTimeout(() => r([]), 300)),
    ]);
    return Array.isArray(accs) && accs.length > 0;
  } catch {
    return false;
  }
}

const ProviderIcon: React.FC<Props> = ({
  provider,
  className,
  forceNeutral,
  showPlus = true,
  size = 16,
}) => {
  const [announced, setAnnounced] = useState<Announced[]>([]);
  const [active, setActive] = useState<EIP1193 | undefined>(undefined);
  const [activeRdns, setActiveRdns] = useState<string | undefined>(undefined);

  // EIP-6963 discovery: collect {provider, rdns}
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent).detail as { info?: { rdns?: string }; provider?: EIP1193 };
      if (!detail?.provider) return;
      setAnnounced((prev) =>
        prev.some((x) => x.provider === detail.provider) ? prev : [...prev, { provider: detail.provider, rdns: detail.info?.rdns }]
      );
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider")); // request late announcers
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  }, []);

  // Pick the provider:
  // 1) the hinted provider (unwrapped),
  // 2) any 6963-announced provider with accounts,
  // 3) injected pool with accounts,
  // 4) otherwise: selected/brand priority.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hinted = unwrap(provider);
      const announcedPool = announced.map((a) => a.provider);
      const pool = [...announcedPool, ...getInjectedPool()];
      const uniq = Array.from(new Set([hinted, ...pool].filter(Boolean))) as EIP1193[];

      // Prefer the one that actually granted accounts to this dapp
      for (const p of uniq) {
        if (await hasAccounts(p)) {
          if (!cancelled) {
            setActive(p);
            // If this one was announced, record its rdns for perfect branding
            const match = announced.find((a) => a.provider === p);
            setActiveRdns(match?.rdns);
          }
          return;
        }
      }

      // Fall back to "selected"
      const selected = uniq.find((p: any) => p?.selected);
      if (!cancelled && selected) {
        setActive(selected);
        const match = announced.find((a) => a.provider === selected);
        setActiveRdns(match?.rdns);
        return;
      }

      // Brand priority (Rabby first, then Coinbase, then MetaMask)
      const byBrand =
        uniq.find((p: any) => p?.isRabby) ??
        uniq.find((p: any) => p?.isCoinbaseWallet) ??
        uniq.find((p: any) => p?.isMetaMask) ??
        uniq[0];

      if (!cancelled) {
        setActive(byBrand);
        const match = announced.find((a) => a.provider === byBrand);
        setActiveRdns(match?.rdns);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, announced]);

  // Derive brand: rdns beats flags; flags check orders Rabby > Coinbase > MetaMask
  const brand: Brand = useMemo(() => {
    if (forceNeutral) return "neutral";
    const rdnsBrand = brandFromRdns(activeRdns);
    if (rdnsBrand) return rdnsBrand;
    return brandFromFlags(active) ?? "neutral";
  }, [active, activeRdns, forceNeutral]);

  if (brand === "neutral") {
    const plusSize = Math.max(10, Math.round(size * 0.6));
    return (
      <span className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
        <Wallet width={size} height={size} aria-label="wallet icon" />
        {showPlus && (
          <Plus
            width={plusSize}
            height={plusSize}
            className="absolute -right-1 -bottom-1"
            aria-label="add"
          />
        )}
      </span>
    );
  }

  return (
    <span className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      <img
        src={ICONS[brand]}
        alt={`${brand} logo`}
        width={size}
        height={size}
        className="inline-block"
        loading="eager"
        decoding="async"
      />
    </span>
  );
};

export default ProviderIcon;
