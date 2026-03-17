import {
  PulseChainConfig,
  EthereumConfig,
  PulseChainWalletSetup,
} from "../config/chainConfig";

/** Shape your UI passes into the button/util */
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  image?: string; // 256KB, 512x512 max (per EIP-747 guidance)
  chainId: number; // 1 = Ethereum, 369 = PulseChain, etc.
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

type WalletAddChainParams = {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

const hexChainId = (id: number) => `0x${id.toString(16)}`;

export type AddTokenResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "rejected" | "failed"; error?: unknown };

export type AddChainResult =
  | { ok: true }
  | {
      ok: false;
      reason: "no_provider" | "unsupported" | "rejected" | "failed";
      error?: unknown;
    };

function isUnsupportedChainMethodError(error: any): boolean {
  const message = String(error?.message ?? "");
  return /wallet_addethereumchain|wallet_switchethereumchain|not supported|not implemented|unsupported/i.test(
    message
  );
}

function isAlreadyAddedChainError(error: any): boolean {
  const message = String(error?.message ?? "");
  return /already added|already exists|already been added|chain.*exists/i.test(message);
}

async function getCurrentChainId(provider: EIP1193Provider): Promise<number | undefined> {
  const current = await provider.request({ method: "eth_chainId" });
  return typeof current === "string" ? parseInt(current, 16) : Number(current);
}

function getWalletAddChainRequest(cfg: WalletAddChainParams) {
  return {
    chainId: cfg.chainIdHex,
    chainName: cfg.chainName,
    nativeCurrency: cfg.nativeCurrency,
    rpcUrls: cfg.rpcUrls,
    blockExplorerUrls: cfg.blockExplorerUrls,
  };
}

function getWalletAddChainParams(targetChainId: number): WalletAddChainParams | undefined {
  if (targetChainId === PulseChainWalletSetup.chainId) {
    return PulseChainWalletSetup;
  }

  const cfg = CHAIN_CONFIG[targetChainId];
  if (!cfg) {
    return undefined;
  }

  return {
    chainId: cfg.chainId,
    chainIdHex: cfg.chainIdHex,
    chainName: cfg.chainName,
    nativeCurrency: {
      name: cfg.chainSymbolFull,
      symbol: cfg.chainSymbol,
      decimals: 18,
    },
    rpcUrls: cfg.providerList,
    blockExplorerUrls: [cfg.explorerUrl],
  };
}

/** Add/switch to the chain the token lives on (EIP-3085/3326) */
async function ensureChain(provider: EIP1193Provider, targetChainId: number) {
  try {
    const now = await getCurrentChainId(provider);
    if (now === targetChainId) return;
  } catch {
    // carry on and try switching/adding anyway
  }

  const cfg = getWalletAddChainParams(targetChainId);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId(targetChainId) }],
    });
    return;
  } catch (err: any) {
    if (err?.code === 4001) {
      throw err;
    }

    if (!cfg) {
      throw err;
    }

    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [getWalletAddChainRequest(cfg)],
      });
      return;
    } catch (addErr: any) {
      if (addErr?.code === 4001) {
        throw addErr;
      }

      if (!isAlreadyAddedChainError(addErr)) {
        throw addErr;
      }
    }

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: cfg.chainIdHex }],
    });
    return;
  }
}

async function ensureActiveChain(provider: EIP1193Provider, targetChainId: number) {
  try {
    const now = await getCurrentChainId(provider);
    if (now === targetChainId) return;
  } catch {
    // carry on and try switching/adding anyway
  }

  const cfg = getWalletAddChainParams(targetChainId);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId(targetChainId) }],
    });
    await waitForChain(provider, targetChainId);
    return;
  } catch (switchErr: any) {
    if (switchErr?.code === 4001) {
      throw switchErr;
    }

    if (!cfg) {
      throw switchErr;
    }

    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [getWalletAddChainRequest(cfg)],
      });
    } catch (addErr: any) {
      if (addErr?.code === 4001) {
        throw addErr;
      }

      if (!isAlreadyAddedChainError(addErr)) {
        throw addErr;
      }
    }

    try {
      const now = await getCurrentChainId(provider);
      if (now === targetChainId) {
        return;
      }
    } catch {
      // fall through to the explicit switch attempt
    }

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: cfg.chainIdHex }],
    });
    await waitForChain(provider, targetChainId);
  }
}

function hasEip1193Request(value: unknown): value is EIP1193Provider {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { request?: unknown }).request === "function"
  );
}

export function getInjectedProvider(
  wallet?: { provider?: EIP1193Provider }
): EIP1193Provider | undefined {
  if (hasEip1193Request(wallet?.provider)) {
    return wallet!.provider;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  const ethereum = (window as typeof window & {
    ethereum?: EIP1193Provider & { providers?: unknown[] };
  }).ethereum;

  if (hasEip1193Request(ethereum)) {
    return ethereum;
  }

  if (Array.isArray(ethereum?.providers)) {
    return ethereum.providers.find(hasEip1193Request);
  }

  return undefined;
}

export async function addChainToWallet(
  targetChainId: number,
  wallet?: { provider?: EIP1193Provider }
): Promise<AddChainResult> {
  const provider = getInjectedProvider(wallet);

  if (!provider) {
    return { ok: false, reason: "no_provider" };
  }

  try {
    await ensureChain(provider, targetChainId);
    await waitForChain(provider, targetChainId).catch(() => {});
    return { ok: true };
  } catch (error: any) {
    if (error?.code === 4001) {
      return { ok: false, reason: "rejected", error };
    }

    if (isUnsupportedChainMethodError(error)) {
      return { ok: false, reason: "unsupported", error };
    }

    console.error(`Failed to add/switch chain ${targetChainId}:`, error);
    return { ok: false, reason: "failed", error };
  }
}

export async function requestAddChainToWallet(
  targetChainId: number,
  wallet?: { provider?: EIP1193Provider }
): Promise<AddChainResult> {
  const provider = getInjectedProvider(wallet);

  if (!provider) {
    return { ok: false, reason: "no_provider" };
  }

  const cfg = getWalletAddChainParams(targetChainId);
  if (!cfg) {
    return {
      ok: false,
      reason: "failed",
      error: new Error(`Unsupported chain for wallet add request: ${targetChainId}`),
    };
  }

  try {
    try {
      const now = await getCurrentChainId(provider);
      if (now === targetChainId) {
        return { ok: true };
      }
    } catch {
      // continue and try the add request
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [getWalletAddChainRequest(cfg)],
    });

    return { ok: true };
  } catch (error: any) {
    if (error?.code === 4001) {
      return { ok: false, reason: "rejected", error };
    }

    if (isAlreadyAddedChainError(error)) {
      return { ok: true };
    }

    if (isUnsupportedChainMethodError(error)) {
      return { ok: false, reason: "unsupported", error };
    }

    console.error(`Failed to add chain ${targetChainId}:`, error);
    return { ok: false, reason: "failed", error };
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
 * Returns an object describing whether it succeeded and why it failed otherwise.
 */
export async function addTokenToWallet(
  token: TokenInfo,
  wallet?: { provider?: EIP1193Provider }
): Promise<AddTokenResult> {
  const provider: EIP1193Provider | undefined =
    wallet?.provider ?? (typeof window !== "undefined" ? (window as any).ethereum : undefined);

  if (!provider?.request) {
    console.error("No EIP-1193 provider found");
    return { ok: false, reason: "failed" };
  }

  try {
    await ensureActiveChain(provider, token.chainId);
  } catch (err: any) {
    if (err?.code === 4001) {
      return { ok: false, reason: "rejected", error: err };
    }

    console.warn("Could not activate the required chain before adding token:", err);
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
    if (isWatchAssetSuccess(res, provider, token)) {
      return { ok: true };
    }
    return { ok: false, reason: "rejected" };
  } catch (err: any) {
    const unsupported =
      err?.code === 4100 ||
      /method.*not supported|not implemented|invalid method/i.test(err?.message);
    if (!unsupported) {
      if (err?.code !== 4001) console.error("wallet_watchAsset failed:", err);
      if (err?.code === 4001) {
        return { ok: false, reason: "rejected", error: err };
      }
      return { ok: false, reason: "failed", error: err };
    }
  }

  // If not supported, let the caller show your existing fallback modal
  console.warn("watchAsset not supported by this provider");
  return { ok: false, reason: "unsupported" };
}

/** Handy for a manual fallback UI if watchAsset isn’t supported */
export const getTokenDisplayInfo = (token: TokenInfo) => ({
  address: token.address,
  symbol: token.symbol,
  decimals: token.decimals,
  chainId: token.chainId,
});

function isWatchAssetSuccess(res: any, provider: EIP1193Provider, token: TokenInfo): boolean {
  if (res === true) return true;

  if (typeof res === "string") {
    const normalized = res.trim().toLowerCase();
    if (normalized === "true" || normalized === token.address.toLowerCase()) {
      return true;
    }
  }

  if (res && typeof res === "object") {
    if (res.success === true || res.result === true) return true;
    const status = (res as any).status;
    if (typeof status === "string" && status.toLowerCase() === "success") return true;

    const nested = (res as any).result;
    if (typeof nested === "string" && nested.trim().toLowerCase() === "true") {
      return true;
    }
  }

  if ((res === null || typeof res === "undefined") && isProbablyRabby(provider)) {
    return true;
  }

  return false;
}

function isProbablyRabby(provider: EIP1193Provider): boolean {
  if (!provider) return false;
  if ((provider as any).isRabby) return true;
  const inner = (provider as any).provider;
  return Boolean(inner?.isRabby);
}
