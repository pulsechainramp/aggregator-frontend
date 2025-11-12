const DEFAULT_PULSECHAIN_RPCS = [
  "https://rpc.pulsechain.com",
  "https://rpc-pulsechain.g4mm4.io",
  "https://pulsechain-rpc.publicnode.com",
];

const parseRpcUrls = (): string[] => {
  const raw =
    import.meta.env.VITE_PULSECHAIN_RPC_URLS ??
    import.meta.env.VITE_RPC_URL;

  if (!raw) {
    return [...DEFAULT_PULSECHAIN_RPCS];
  }

  const urls = raw
    .split(",")
    .map((entry: string) => entry.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error(
      "VITE_PULSECHAIN_RPC_URLS must include at least one RPC endpoint."
    );
  }

  return Array.from(new Set(urls));
};

const coerceNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const urls = parseRpcUrls();

export const pulsechainRpcConfig = {
  urls,
  stallTimeoutMs: coerceNumber(import.meta.env.VITE_RPC_STALL_TIMEOUT_MS, 1200),
  retryCount: coerceNumber(import.meta.env.VITE_RPC_RETRY_COUNT, 2),
  retryDelayMs: coerceNumber(import.meta.env.VITE_RPC_RETRY_DELAY_MS, 200),
  cooldownMs: coerceNumber(import.meta.env.VITE_RPC_COOLDOWN_MS, 30000),
};

export const getPrimaryPulsechainRpcUrl = (): string => pulsechainRpcConfig.urls[0];

