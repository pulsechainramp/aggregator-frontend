import { ethers } from "ethers";
import PulseXStableSwapPoolAbi from "../abis/PulseXStableSwapPool.json";
import PulsexFactoryAbi from "../abis/PulsexFactory.json";
import { PulsexConfig } from "../config/pulsex";
import { QuoteType } from "../types/Swap";
import { ZeroAddress } from "../const/swap";
import {
  Route,
  SwapRoute,
  SwapStep,
  combineRoute,
  encodeSwapRoute,
  toCorrectDexName,
} from "./routeEncoding";

const RATE_LIMIT_MAX_REQUESTS = 9;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_STORAGE_KEY =
  "pulsechainramp.piteas.quote.timestamps.v1";
const MIN_WAIT_MS = 100;

const provider = new ethers.JsonRpcProvider(PulsexConfig.RPC_URL);
const pulsexV1Factory = new ethers.Contract(
  PulsexConfig.PulsexV1FactoryAddress,
  PulsexFactoryAbi,
  provider
);
const pulsexV2Factory = new ethers.Contract(
  PulsexConfig.PulsexV2FactoryAddress,
  PulsexFactoryAbi,
  provider
);

const stablePoolContracts = new Map<string, ethers.Contract>();

const getStablePoolContract = (address: string): ethers.Contract => {
  if (!stablePoolContracts.has(address)) {
    stablePoolContracts.set(
      address,
      new ethers.Contract(address, PulseXStableSwapPoolAbi, provider)
    );
  }
  return stablePoolContracts.get(address)!;
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

  if (typeof navigator !== "undefined" && (navigator as any).locks?.request) {
    const acquired = await (navigator as any).locks.request(
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

      for (const [pathIndex, path] of subswap.paths.entries()) {
        let userData = "0x";

        if (path.exchange === "PulseX Stable") {
          let index1 = -1;
          let index2 = -1;
          const stablePool = getStablePoolContract(path.address);

          let numCoins = 3;
          try {
            const coinsFn = (stablePool as any).N_COINS ?? (stablePool as any).n_coins ?? (stablePool as any).nCoins;
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

            if (
              token.toLowerCase() ===
              piteasRoute.paths[swapIndex][subswapIndex].address.toLowerCase()
            ) {
              index1 = i;
            } else if (
              token.toLowerCase() ===
              piteasRoute.paths[swapIndex][subswapIndex + 1].address.toLowerCase()
            ) {
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
          path: [
            piteasRoute.paths[swapIndex][subswapIndex].address,
            piteasRoute.paths[swapIndex][subswapIndex + 1].address,
          ],
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
    outputAmount: ethers.getBigInt(destAmount).toString(),
    gasAmountEstimated: gasUseEstimate,
    gasUSDEstimated: Number(gasUseEstimateUSD ?? 0),
    route: combinedRoute,
  };
};

export const fetchPiteasQuoteClient = async (
  params: PiteasQuoteParams
): Promise<QuoteType> => {
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
    return transformQuoteData(data, isEthOut);
  });
};
