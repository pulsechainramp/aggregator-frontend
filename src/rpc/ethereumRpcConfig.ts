const DEFAULT_ETHEREUM_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://ethereum.public.blockpi.network/v1/rpc/public",
  "https://eth.drpc.org",
];

const parseRpcUrls = (): string[] => {
  const raw =
    import.meta.env.VITE_ETHEREUM_RPC_URLS ??
    import.meta.env.VITE_ETH_RPC_URL ??
    DEFAULT_ETHEREUM_RPCS.join(",");

  const urls = raw
    .split(",")
    .map((entry: string) => entry.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    return [...DEFAULT_ETHEREUM_RPCS];
  }

  return Array.from(new Set(urls));
};

const coerceNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const urls = parseRpcUrls();

if (urls.length === 0) {
  throw new Error("VITE_ETHEREUM_RPC_URLS must include at least one RPC endpoint.");
}

export const ethereumRpcConfig = {
  urls,
  stallTimeoutMs: coerceNumber(import.meta.env.VITE_ETH_RPC_STALL_TIMEOUT_MS ?? import.meta.env.VITE_RPC_STALL_TIMEOUT_MS, 1200),
  retryCount: coerceNumber(import.meta.env.VITE_ETH_RPC_RETRY_COUNT ?? import.meta.env.VITE_RPC_RETRY_COUNT, 2),
  retryDelayMs: coerceNumber(import.meta.env.VITE_ETH_RPC_RETRY_DELAY_MS ?? import.meta.env.VITE_RPC_RETRY_DELAY_MS, 200),
  cooldownMs: coerceNumber(import.meta.env.VITE_ETH_RPC_COOLDOWN_MS ?? import.meta.env.VITE_RPC_COOLDOWN_MS, 30000),
};

export const getPrimaryEthereumRpcUrl = (): string => ethereumRpcConfig.urls[0];
