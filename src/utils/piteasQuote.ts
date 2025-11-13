import { ethers } from "ethers";
import PulseXStableSwapPoolAbi from "../abis/PulseXStableSwapPool.json";
import PulsexFactoryAbi from "../abis/PulsexFactory.json";
import { PulsexConfig } from "../config/pulsex";
import { UnsignedQuoteType } from "../types/Swap";
import { ZeroAddress } from "../const/swap";
import {
  Route,
  SwapRoute,
  SwapStep,
  combineRoute,
  encodeSwapRoute,
  toCorrectDexName,
} from "./routeEncoding";

type StablePoolContract = ethers.Contract & {
  N_COINS?: () => Promise<bigint>;
  n_coins?: () => Promise<bigint>;
  nCoins?: () => Promise<bigint>;
  coins: (index: number) => Promise<string>;
};

declare global {
  interface Navigator {
    locks?: LockManager;
  }
}

const hasNavigatorLocks = (
  nav: Navigator
): nav is Navigator & { locks: LockManager } => Boolean(nav.locks);

const RATE_LIMIT_MAX_REQUESTS = 9;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_STORAGE_KEY =
  "pulsechainramp.piteas.quote.timestamps.v1";
const MIN_WAIT_MS = 100;

import {
  getPulsechainEthersProvider,
  resetPulsechainEthersProvider,
} from "../rpc/pulsechainProviders";

let provider = getPulsechainEthersProvider();

const createFactoryContract = (address: string) =>
  new ethers.Contract(address, PulsexFactoryAbi, provider);

let pulsexV1Factory = createFactoryContract(
  PulsexConfig.PulsexV1FactoryAddress
);
let pulsexV2Factory = createFactoryContract(
  PulsexConfig.PulsexV2FactoryAddress
);

const stablePoolContracts = new Map<string, StablePoolContract>();

const getStablePoolContract = (address: string): StablePoolContract => {
  if (!stablePoolContracts.has(address)) {
    stablePoolContracts.set(
      address,
      new ethers.Contract(
        address,
        PulseXStableSwapPoolAbi,
        provider
      ) as StablePoolContract
    );
  }
  return stablePoolContracts.get(address)!;
};

const resetPiteasProvider = () => {
  provider = resetPulsechainEthersProvider();
  pulsexV1Factory = createFactoryContract(
    PulsexConfig.PulsexV1FactoryAddress
  );
  pulsexV2Factory = createFactoryContract(
    PulsexConfig.PulsexV2FactoryAddress
  );
  stablePoolContracts.clear();
};

const isNetworkChangedError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as { code?: string; message?: string };
  return (
    err.code === "NETWORK_ERROR" &&
    typeof err.message === "string" &&
    /network changed/i.test(err.message)
  );
};

const withProviderRecovery = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isNetworkChangedError(error)) {
      console.warn(
        "[Piteas Quote] PulseChain provider network changed, rebuilding provider"
      );
      resetPiteasProvider();
      return await operation();
    }
    throw error;
  }
};

const isStorageAvailable = (): boolean => {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return false;
  }
  try {
    const testKey = "__piteas__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const readTimestamps = (): number[] => {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => Number(v) || 0) : [];
  } catch {
    return [];
  }
};

const writeTimestamps = (timestamps: number[]): void => {
  if (!isStorageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(
      RATE_LIMIT_STORAGE_KEY,
      JSON.stringify(timestamps)
    );
  } catch {
    /* no-op */
  }
};

const tryAcquireRateLimitSlot = async (): Promise<{
  acquired: boolean;
  wait: number;
}> => {
  const attempt = (): { acquired: boolean; wait: number } => {
    if (!isStorageAvailable()) {
      return { acquired: true, wait: 0 };
    }

    const now = Date.now();
    const timestamps = readTimestamps().filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );

    if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
      const earliest = Math.min(...timestamps);
      const wait = Math.max(
        RATE_LIMIT_WINDOW_MS - (now - earliest),
        MIN_WAIT_MS
      );
      writeTimestamps(timestamps);
      return { acquired: false, wait };
    }

    timestamps.push(now);
    writeTimestamps(timestamps);
    return { acquired: true, wait: 0 };
  };

  if (typeof navigator !== "undefined" && hasNavigatorLocks(navigator)) {
    const acquired = await navigator.locks.request(
      "pulsechainramp-piteas-rate-limit",
      { mode: "exclusive" },
      () => attempt()
    );
    return acquired ?? { acquired: false, wait: MIN_WAIT_MS };
  }

  return attempt();
};

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withRateLimit = async <T>(task: () => Promise<T>): Promise<T> => {
  while (true) {
    const result = await tryAcquireRateLimitSlot();
    if (result.acquired) {
      return task();
    }
    await delay(result.wait);
  }
};

export interface PiteasQuoteParams {
  tokenInAddress: string;
  tokenOutAddress: string;
  amount: string;
  allowedSlippage?: number;
  account?: string;
}

interface PiteasToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

interface PiteasPathInfo {
  percent: number;
  address: string;
  exchange: string;
}

interface PiteasSubswap {
  percent: number;
  paths: PiteasPathInfo[];
}

interface PiteasSwap {
  percent: number;
  subswaps: PiteasSubswap[];
}

interface PiteasRoute {
  paths: PiteasToken[][];
  swaps: PiteasSwap[];
}

interface PiteasApiQuote {
  srcToken: PiteasToken;
  destToken: PiteasToken;
  srcAmount: string;
  destAmount: string;
  route: PiteasRoute;
  gasUseEstimate: number;
  gasUseEstimateUSD: number;
}

const sanitizeBaseUrl = (baseUrl: string): string => {
  if (!baseUrl) {
    throw new Error("Piteas API base URL is not configured");
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const buildRequestUrl = (
  baseUrl: string,
  params: PiteasQuoteParams
): string => {
  const url = `${sanitizeBaseUrl(baseUrl)}/quote`;
  const query = new URLSearchParams({
    tokenInAddress: params.tokenInAddress,
    tokenOutAddress: params.tokenOutAddress,
    amount: params.amount,
    allowedSlippage: String(params.allowedSlippage ?? 0.5),
  });

  if (params.account) {
    query.set("account", params.account);
  }

  return `${url}?${query.toString()}`;
};

const recomposeStep = async (step: SwapStep): Promise<SwapStep> => {
  const [tokenIn, tokenOut] = step.path;
  if (!tokenIn || !tokenOut) {
    return step;
  }

  const v2Pair = await pulsexV2Factory.getPair(tokenIn, tokenOut);
  if (v2Pair !== ethers.ZeroAddress) {
    return {
      ...step,
      dex: "pulsexV2",
      pool: v2Pair,
    };
  }

  const v1Pair = await pulsexV1Factory.getPair(tokenIn, tokenOut);
  if (v1Pair !== ethers.ZeroAddress) {
    return {
      ...step,
      dex: "pulsexV1",
      pool: v1Pair,
    };
  }

  return step;
};

const transformQuoteData = async (
  response: PiteasApiQuote,
  isEthOut: boolean
): Promise<QuoteType> => {
  const { srcToken, destToken, destAmount, route: piteasRoute, gasUseEstimate, gasUseEstimateUSD } =
    response;

  const swapRoute: SwapRoute = {
    steps: [],
    deadline: Math.floor(Date.now() / 1000 + 10 * 60),
    amountIn: response.srcAmount,
    amountOutMin: ethers.getBigInt(destAmount).toString(),
    parentGroups: [],
    groupCount: 0,
    destination: ethers.ZeroAddress,
    tokenIn: srcToken.address,
    tokenOut: destToken.address,
    isETHOut: isEthOut,
  };

  let currentGroupId = 0;

  for (const [swapIndex, swap] of piteasRoute.swaps.entries()) {
    const parentGroupId = currentGroupId++;
    swapRoute.parentGroups.push({ id: parentGroupId, percent: swap.percent });

    for (const [subswapIndex, subswap] of swap.subswaps.entries()) {
      const groupId = currentGroupId++;

      const pathTokens = piteasRoute.paths[swapIndex] ?? [];

      for (const [pathIndex, path] of subswap.paths.entries()) {
        const fromToken = pathTokens[subswapIndex];
        const toToken = pathTokens[subswapIndex + 1];

        if (!fromToken || !toToken) {
          continue;
        }

        let userData = "0x";

        if (path.exchange === "PulseX Stable") {
          let index1 = -1;
          let index2 = -1;
          const stablePool = getStablePoolContract(path.address);

          let numCoins = 3;
          try {
            const coinsFn = stablePool.N_COINS ?? stablePool.n_coins ?? stablePool.nCoins;
            if (coinsFn) {
              const result = await coinsFn();
              const parsed = Number(result);
              if (Number.isFinite(parsed) && parsed > 0) {
                numCoins = parsed;
              }
            }
          } catch {
            // default to 3 for legacy pools without N_COINS
          }

          for (let i = 0; i < numCoins; i++) {
            let token: string | undefined;
            try {
              token = await stablePool.coins(i);
            } catch {
              break;
            }

            if (!token) {
              continue;
            }

            const normalized = token.toLowerCase();
            if (normalized === fromToken.address.toLowerCase()) {
              index1 = i;
            } else if (normalized === toToken.address.toLowerCase()) {
              index2 = i;
            }
          }

          userData = ethers.solidityPacked(["uint8", "uint8"], [
            index1,
            index2,
          ]);
        }

        let step: SwapStep = {
          dex: toCorrectDexName(path.exchange),
          path: [fromToken.address, toToken.address],
          percent: path.percent,
          pool: path.address,
          userData,
          groupId,
          parentGroupId:
            pathIndex === 0 && subswapIndex === 0 ? parentGroupId : groupId - 1,
        };

        if (!step.dex) {
          step = await recomposeStep(step);
        }

        swapRoute.steps.push(step);
      }
    }
  }

  swapRoute.groupCount = currentGroupId;

  const combinedRoute = combineRoute(piteasRoute as Route);

  return {
    calldata: encodeSwapRoute(swapRoute),
    tokenInAddress: srcToken.address,
    tokenOutAddress: destToken.address,
    amountIn: swapRoute.amountIn,
    minAmountOut: swapRoute.amountOutMin,
    outputAmount: ethers.getBigInt(destAmount).toString(),
    deadline: swapRoute.deadline,
    gasAmountEstimated: gasUseEstimate,
    gasUSDEstimated: Number(gasUseEstimateUSD ?? 0),
    route: combinedRoute,
  };
};

export const fetchPiteasQuoteClient = async (
  params: PiteasQuoteParams
): Promise<UnsignedQuoteType> => {
  const baseUrl = import.meta.env.VITE_PITEAS_API_BASE_URL ?? "";

  const url = buildRequestUrl(baseUrl, params);
  const isEthOut =
    params.tokenOutAddress === "PLS" ||
    params.tokenOutAddress === ZeroAddress ||
    params.tokenOutAddress === ethers.ZeroAddress;

  return withRateLimit(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Piteas quote failed with status ${response.status}`);
    }

    const data = (await response.json()) as PiteasApiQuote;
    return withProviderRecovery(() =>
      transformQuoteData(data, isEthOut)
    );
  });
};
