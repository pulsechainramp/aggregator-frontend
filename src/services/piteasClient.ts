import { PiteasBaseURL } from "../const/swap";
import {
  buildAllowlistFromEnvAndQuery,
  findUnsupportedDexes,
  ENFORCE_ALLOWED_DEXES
} from "../utils/dexPolicy";

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

  return normalizePiteasQuoteToApp(raw);
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

// Turn Piteas SDK JSON into the app's QuoteType
export function normalizePiteasQuoteToApp(p: any) {
  return {
    calldata: p?.methodParameters?.calldata ?? "0x",
    tokenInAddress: p?.srcToken?.address ?? "",
    tokenOutAddress: p?.destToken?.address ?? "",
    outputAmount: toDecimalStringMaybeHex(p?.destAmount),
    gasAmountEstimated: p?.gasUseEstimate ?? 0,
    gasUSDEstimated: p?.gasUseEstimateUSD ?? 0,
    route: combineRouteClient(p?.route),
  };
}