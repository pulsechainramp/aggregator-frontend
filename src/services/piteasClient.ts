import { PiteasBaseURL } from "../const/swap";
import {
  buildAllowlistFromEnvAndQuery,
  findUnsupportedDexes,
  ENFORCE_ALLOWED_DEXES
} from "../utils/dexPolicy";
import { ethers, AbiCoder, ParamType } from "ethers";
import { PulseChainConfig } from "../config/chainConfig";

// Canonicalize DEX names (same mapping as routing-api/src/utils/web3.ts)
function toCorrectDexName(dex: string) {
  if (!dex) return "";
  if (dex === "PulseX V1") return "pulsexV1";
  if (dex === "PulseX V2") return "pulsexV2";
  if (dex === "PulseX Stable") return "pulsexStable";
  if (dex === "Phux") return "phux";
  if (dex === "9inch V2") return "9inchV2";
  if (dex === "9inch V3") return "9inchV3";
  if (dex === "9mm V2") return "9mmV2";
  if (dex === "9mm V3") return "9mmV3";
  if (dex === "pDex V3") return "pDexV3";
  if (dex.toLowerCase().includes("dextop")) return "dexTop";
  if (dex.toLowerCase().includes("tide")) return "tide";
  return "";
}

// Your SwapRoute tuple ABI (identical to routing-api/src/utils/web3.ts)
const SWAP_ROUTE_ABI = [
  ParamType.from({
    name: "SwapRoute",
    type: "tuple",
    components: [
      {
        name: "steps",
        type: "tuple[]",
        components: [
          { name: "dex", type: "string" },
          { name: "path", type: "address[]" },
          { name: "pool", type: "address" },
          { name: "percent", type: "uint256" },
          { name: "groupId", type: "uint256" },
          { name: "parentGroupId", type: "uint256" },
          { name: "userData", type: "bytes" },
        ],
      },
      {
        name: "parentGroups",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "percent", type: "uint256" },
        ],
      },
      { name: "destination", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "groupCount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
    ],
  }),
];

// Minimal ABI for PulseX stable pools (to resolve coin indices)
const PULSEX_STABLE_POOL_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "coins",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Cache pool coin arrays to minimize RPC calls
const poolCoinsCache = new Map<string, string[]>();

async function getStableIndices(
  poolAddress: string,
  tokenIn: string,
  tokenOut: string
): Promise<{ i: number; j: number }> {
  const provider = new ethers.JsonRpcProvider(
    (PulseChainConfig.providerList && PulseChainConfig.providerList[0]) ||
      "https://rpc.pulsechain.com"
  );

  let coins: string[] | undefined = poolCoinsCache.get(poolAddress.toLowerCase());
  if (!coins) {
    const pool = new ethers.Contract(poolAddress, PULSEX_STABLE_POOL_ABI, provider);
    // PulseX stable pools are tri-pools; indices 0..2
    const c0 = await pool.coins(0);
    const c1 = await pool.coins(1);
    const c2 = await pool.coins(2);
    coins = [c0, c1, c2].map((a: string) => a.toLowerCase());
    poolCoinsCache.set(poolAddress.toLowerCase(), coins);
  }

  const a = tokenIn.toLowerCase();
  const b = tokenOut.toLowerCase();
  const i = coins.indexOf(a);
  const j = coins.indexOf(b);
  if (i === -1 || j === -1) {
    throw new Error("Stable pool coin index not found");
  }
  return { i, j };
}

// Build your on-chain SwapRoute from a Piteas quote JSON
async function buildSwapRouteFromPiteas(p: any): Promise<{ calldata: string; combinedRoute: any }> {
  const { srcToken, destToken, srcAmount, destAmount, route } = p || {};
  const { paths, swaps } = route || {};

  if (!srcToken?.address || !destToken?.address || !Array.isArray(swaps) || !Array.isArray(paths)) {
    throw new Error("Invalid Piteas quote shape");
  }

  const parentGroups: { id: number; percent: number }[] = [];
  const steps: any[] = [];
  let currentGroupId = 0;

  const swapsArr = (swaps ?? []) as any[];
  for (let swapIndex = 0; swapIndex < swapsArr.length; swapIndex++) {
    const swap = swapsArr[swapIndex];
    const parentGroupId = currentGroupId++;
    parentGroups.push({ id: parentGroupId, percent: swap.percent });

    const subswapsArr = (swap?.subswaps ?? []) as any[];
    for (let subswapIndex = 0; subswapIndex < subswapsArr.length; subswapIndex++) {
      const subswap = subswapsArr[subswapIndex];
      const groupId = currentGroupId++;

      const pathsArr = (subswap?.paths ?? []) as any[];
      for (let pathIndex = 0; pathIndex < pathsArr.length; pathIndex++) {
        const path = pathsArr[pathIndex];

        const dexName = toCorrectDexName(path.exchange);
        if (!dexName) {
          throw new Error(`Unsupported DEX label from Piteas: ${path.exchange}`);
        }

        const inToken = paths?.[swapIndex]?.[subswapIndex]?.address;
        const outToken = paths?.[swapIndex]?.[subswapIndex + 1]?.address;
        if (!inToken || !outToken) throw new Error("Malformed Piteas route tokens");

        let userData = "0x";
        if (dexName === "pulsexStable") {
          const { i, j } = await getStableIndices(path.address, inToken, outToken);
          userData = ethers.solidityPacked(["uint8", "uint8"], [i, j]);
        }

        steps.push({
          dex: dexName,
          path: [inToken, outToken],
          pool: path.address,
          percent: path.percent,
          groupId,
          parentGroupId: pathIndex === 0 && subswapIndex === 0 ? parentGroupId : groupId - 1,
          userData,
        });
      }
    }
  }

  const swapRoute = {
    steps,
    parentGroups,
    destination: ethers.ZeroAddress,
    tokenIn: srcToken.address,
    tokenOut: destToken.address,
    groupCount: currentGroupId,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    amountIn: ethers.getBigInt(srcAmount).toString(),
    amountOutMin: ethers.getBigInt(destAmount).toString(),
  };

  const abiCoder = new AbiCoder();
  const calldata = abiCoder.encode(SWAP_ROUTE_ABI, [swapRoute]);
  return { calldata, combinedRoute: combineRouteClient(route) };
}

let currentController: AbortController | null = null;

export type PiteasQuoteArgs = {
  tokenInAddress: string;  // "PLS" or addr
  tokenOutAddress: string; // "PLS" or addr
  amountBaseUnits: string; // already parseUnits(...)
  allowedSlippage: number; // percent (e.g., 0.5)
  account?: string;
};

export async function fetchPiteasQuote(args: PiteasQuoteArgs) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  const u = new URL("quote", PiteasBaseURL);
  u.searchParams.set("tokenInAddress", args.tokenInAddress);
  u.searchParams.set("tokenOutAddress", args.tokenOutAddress);
  u.searchParams.set("amount", args.amountBaseUnits);
  u.searchParams.set("allowedSlippage", String(args.allowedSlippage));
  if (args.account) u.searchParams.set("account", args.account);

  const res = await fetch(u.toString(), { signal: currentController.signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Piteas ${res.status}: ${body.slice(0,256)}`);
    (err as any).retryAfter = res.headers.get("Retry-After");
    throw err;
  }
  const raw = await res.json();

  // Deny-by-default for unknown DEX names; allow only configured slugs.
  const allow = buildAllowlistFromEnvAndQuery();
  const violations = findUnsupportedDexes(raw?.route, allow);
  if (violations.length) {
    const err: any = new Error("UNSUPPORTED_DEX_IN_ROUTE");
    err.status = 409;
    err.details = { unsupportedDexes: violations };
    if (ENFORCE_ALLOWED_DEXES) throw err;

    // Soft mode: log and continue with the raw quote (UI may still pick server fallback)
    console.warn("[Piteas] unsupported DEX(es) detected (soft mode):", violations);
  }

  return await normalizePiteasQuoteToApp(raw);
}

function toDecimalStringMaybeHex(x: any): string {
  if (typeof x !== "string") return "0";
  try {
    return x.startsWith("0x") ? BigInt(x).toString() : x;
  } catch {
    return "0";
  }
}

// Minimal client-side combineRoute (mirrors server combineRoute)
function combineRouteClient(route: any) {
  if (!route?.swaps) return [];
  return route.swaps.map((swap: any, swapIdx: number) => ({
    percent: (swap.percent ?? 0) / 1000,
    subroutes: (swap.subswaps ?? []).map((sub: any, subIdx: number) => ({
      percent: (sub.percent ?? 0) / 1000,
      paths: (sub.paths ?? []).map((p: any, pathIdx: number) => {
        const pathArr = route?.paths?.[swapIdx];
        const tokens =
          Array.isArray(pathArr) &&
          subIdx >= 0 &&
          subIdx + 1 < pathArr.length &&
          pathArr[subIdx] &&
          pathArr[subIdx + 1]
            ? [pathArr[subIdx], pathArr[subIdx + 1]]
            : [];

        const { address, percent, ...rest } = p;
        return {
          ...rest,
          percent: (p.percent ?? 0) / 1000,
          tokens,
        };
      }),
    })),
  }));
}

// Turn Piteas JSON into the app's QuoteType (using our encoded SwapRoute bytes)
export async function normalizePiteasQuoteToApp(p: any) {
  const { calldata, combinedRoute } = await buildSwapRouteFromPiteas(p);
  return {
    calldata, // <-- our SwapRoute bytes, consumable by AffiliateRouter.executeSwap
    tokenInAddress: p?.srcToken?.address ?? "",
    tokenOutAddress: p?.destToken?.address ?? "",
    outputAmount: toDecimalStringMaybeHex(p?.destAmount),
    gasAmountEstimated: p?.gasUseEstimate ?? 0,
    gasUSDEstimated: p?.gasUseEstimateUSD ?? 0,
    route: combinedRoute,
  };
}