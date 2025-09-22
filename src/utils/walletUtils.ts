import { PulseChainConfig, EthereumConfig } from "../config/chainConfig";

/** Shape your UI passes into the button/util */
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;   // ≤256KB, ≤512x512 if bitmap (per EIP-747 guidance)
  chainId: number;  // 1 = Ethereum, 369 = PulseChain, etc.
}

/** Minimal EIP-1193 provider surface */
export type EIP1193Provider = {
  request: (args: { method: string; params?: any }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
};

/** Known chains in your app */
const CHAIN_CONFIG: Record<
  number,
  {
    chainId: number;
    chainSymbol: string;
    chainName: string;
    chainSymbolFull: string;
    chainIdHex: string;
    providerList: string[];
    explorerUrl: string;
  }
> = {
  [PulseChainConfig.chainId]: PulseChainConfig,
  [EthereumConfig.chainId]: EthereumConfig,
};

const hexChainId = (id: number) => `0x${id.toString(16)}`;

/** Add/switch to the chain the token lives on (EIP-3085/3326) */
async function ensureChain(provider: EIP1193Provider, targetChainId: number) {
  try {
    const current = await provider.request({ method: "eth_chainId" });
    const now = typeof current === "string" ? parseInt(current, 16) : Number(current);
    if (now === targetChainId) return;
  } catch {
    // carry on and try switching/adding anyway
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId(targetChainId) }],
    });
    return;
  } catch (err: any) {
    // 4902: chain not added
    if (err?.code === 4902 || /not added|Unrecognized chain/i.test(err?.message)) {
      const cfg = CHAIN_CONFIG[targetChainId];
      if (!cfg) throw err;

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: cfg.chainIdHex,
            chainName: cfg.chainName,
            nativeCurrency: {
              name: cfg.chainSymbolFull,
              symbol: cfg.chainSymbol,
              decimals: 18,
            },
            rpcUrls: cfg.providerList,
            blockExplorerUrls: [cfg.explorerUrl],
          },
        ],
      });
      // Retry switch after adding
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: cfg.chainIdHex }],
      });
      return;
    }
    throw err;
  }
}

/** Wait until the provider actually reports the requested chain */
export function waitForChain(
  provider: EIP1193Provider,
  targetChainId: number,
  timeoutMs = 15000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const targetHex = hexChainId(targetChainId);

    const cleanup = (handler?: any) => {
      if (done) return;
      done = true;
      if (handler) provider?.removeListener?.("chainChanged", handler);
      clearTimeout(timer);
    };

    const onChange = (chainId: string) => {
      if (chainId === targetHex || parseInt(chainId, 16) === targetChainId) {
        cleanup(onChange);
        resolve();
      }
    };

    provider?.on?.("chainChanged", onChange);

    provider
      .request({ method: "eth_chainId" })
      .then((id: string) => {
        if (id === targetHex || parseInt(id, 16) === targetChainId) {
          cleanup(onChange);
          resolve();
        }
      })
      .catch(() => { /* ignore; rely on event/timeout */ });

    const timer = setTimeout(() => {
      cleanup(onChange);
      reject(new Error("chain switch timeout"));
    }, timeoutMs);
  });
}

/**
 * Ask the connected wallet to add/watch an ERC-20 token (EIP-747).
 * Returns true when the user accepts.
 */
export async function addTokenToWallet(
  token: TokenInfo,
  wallet?: { provider?: EIP1193Provider }
): Promise<boolean> {
  const provider: EIP1193Provider | undefined =
    wallet?.provider ?? (typeof window !== "undefined" ? (window as any).ethereum : undefined);

  if (!provider?.request) {
    console.error("No EIP-1193 provider found");
    return false;
  }

  // Best effort: ensure correct chain first (uses your existing helpers)
  try {
    await ensureChain(provider, token.chainId);
    await waitForChain(provider, token.chainId).catch(() => {});
  } catch (e) {
    // Some wallets allow adding a token off-chain; proceed anyway
    console.warn("Could not switch/add chain before adding token:", e);
  }

  // Standard EIP-747
  try {
    const res = await provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: token.address,
          symbol: (token.symbol || "").slice(0, 11), // common wallet limit
          decimals: token.decimals,
          image: token.image,
        },
      },
    });
    return res === true;
  } catch (err: any) {
    const unsupported =
      err?.code === 4100 ||
      /method.*not supported|not implemented|invalid method/i.test(err?.message);
    if (!unsupported) {
      if (err?.code !== 4001) console.error("wallet_watchAsset failed:", err);
      return false;
    }
  }

  // If not supported, let the caller show your existing fallback modal
  console.warn("watchAsset not supported by this provider");
  return false;
}

/** Handy for a manual fallback UI if watchAsset isn’t supported */
export const getTokenDisplayInfo = (token: TokenInfo) => ({
  address: token.address,
  symbol: token.symbol,
  decimals: token.decimals,
  chainId: token.chainId,
});
