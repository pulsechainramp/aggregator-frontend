import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { QuoteType, TokenType } from "../types/Swap";
import { ethers } from "ethers";
import { isSelfReferral, getStoredReferralCode } from "../utils/referralUtils";
import { ZeroAddress, SwapManagerAddress, BackendURL, USDC, DAI, WPLS, WETH, USDT } from "../const/swap";
import {
  approveToken,
  executeSwap,
  needsApproval,
  createSwapManager,
} from "../contracts/SwapManager";
import { store } from "./store";
import { PiteasRateLimiter } from "../utils/rateLimiter";
import { SingleFlight } from "../utils/singleflight";
import { fetchPiteasQuote } from "../services/piteasClient";
import {
  PreferClientPiteasFirst,
  ClientQuoteTTLms,
  ClientPiteasMaxPerMinute,
} from "../const/swap";

const limiter = PiteasRateLimiter.get(ClientPiteasMaxPerMinute);
const single = new SingleFlight<any>();
const clientCache = new Map<string, { ts: number; data: any }>();

interface SwapState {
  allChains: TokenType[];
  availableTokens: TokenType[];
  fromToken: TokenType | null;
  toToken: TokenType | null;
  fromAmount: string;
  quote: QuoteType | null;
  slippage: number;
  // Balance state
  fromTokenBalance: string;
  toTokenBalance: string;
  nativeBalance: string;
  // Swap execution state
  isApproving: boolean;
  isSwapping: boolean;
  isApproved: boolean;
  // Transaction tracking
  transactionHash: string | null;
}

const initialState: SwapState = {
  allChains: [],
  availableTokens: [],
  fromToken: null,
  toToken: null,
  fromAmount: "",
  quote: null,
  slippage: 0.5,
  // Balance state
  fromTokenBalance: "0",
  toTokenBalance: "0",
  nativeBalance: "0",
  // Swap execution state
  isApproving: false,
  isSwapping: false,
  isApproved: false,
  // Transaction tracking
  transactionHash: null,
};

// Get token balance
export const getTokenBalance = createAsyncThunk(
  "swap/getTokenBalance",
  async ({
    tokenAddress,
    userAddress,
    decimals,
  }: {
    tokenAddress: string;
    userAddress: string;
    decimals: number;
  }) => {
    if (!userAddress) return "0";

    try {
      const swapManager = createSwapManager();
      const balance = await swapManager.getTokenBalance(
        tokenAddress,
        userAddress,
        decimals
      );

      // Convert from wei to human readable format
      if (tokenAddress === ZeroAddress) {
        // Native token balance is already in wei, convert to ether
        return ethers.formatEther(balance);
      } else {
        // ERC20 token balance is already in wei, convert to token units
        return ethers.formatUnits(balance, decimals);
      }
    } catch (error) {
      console.error("Error getting token balance:", error);
      return "0";
    }
  }
);

// Get native balance
export const getNativeBalance = createAsyncThunk(
  "swap/getNativeBalance",
  async (userAddress: string) => {
    if (!userAddress) return "0";

    try {
      const swapManager = createSwapManager();
      const balance = await swapManager.getTokenBalance(
        ZeroAddress,
        userAddress,
        18
      );
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting native balance:", error);
      return "0";
    }
  }
);

// Check token allowance
export const checkTokenAllowance = createAsyncThunk(
  "swap/checkAllowance",
  async ({
    tokenAddress,
    amount,
    decimals,
    userAddress,
  }: {
    tokenAddress: string;
    amount: string;
    decimals: number;
    userAddress: string;
  }) => {
    if (tokenAddress === ZeroAddress) {
      return { hasAllowance: true, allowance: "0" };
    }

    const approvalNeeded = await needsApproval(
      tokenAddress,
      userAddress,
      SwapManagerAddress,
      amount,
      decimals
    );

    return {
      // hasAllowance is simply the opposite of "needs approval"
      hasAllowance: !approvalNeeded,
    };
  }
);

// Approve token
export const approveTokenAction = createAsyncThunk(
  "swap/approveTokenAction",
  async ({
    tokenAddress,
    account,
    amount,
    decimals,
  }: {
    tokenAddress: string;
    account: string;
    amount: string;
    decimals: number;
  }) => {
    if (tokenAddress === ZeroAddress) {
      throw new Error("Native token does not require approval");
    }

    const transaction = await approveToken({
      tokenAddress,
      spenderAddress: SwapManagerAddress,
      account,
      amount,
      decimals,
    });

    return {
      transactionHash: transaction.transactionHash,
    };
  }
);

// Execute swap
export const executeSwapAction = createAsyncThunk(
  "swap/executeSwapAction",
  async ({
    quote,
    value,
    account,
    fromToken,
  }: {
    quote: QuoteType;
    value: string;
    account: string;
    fromToken: TokenType;
  }) => {
    // Get referral address from Redux store
    const state = store.getState();
    let referralAddress = state.referral.referralAddress?.address; // changed to let for fallback hydration
    // Fallback: resolve from localStorage at swap time if Redux not hydrated yet
    if (!referralAddress) {
      const code = getStoredReferralCode();
      if (code) {
        try {
          const resp = await fetch(`${BackendURL}referral/address?referralCode=${encodeURIComponent(code)}`);
          if (resp.ok) {
            const data = await resp.json();
            const resolved: string | undefined =
              data?.address ?? data?.referralAddress ?? undefined;
            if (resolved) referralAddress = resolved;
          }
        } catch {
          // no-op: proceed without a referrer
        }
      }
    }
    
    // Only use referral address if it's not a self-referral
    const referrerAddress = referralAddress && account && 
      !isSelfReferral(account, referralAddress)
      ? referralAddress 
      : undefined;

    // Log if self-referral is detected
    if (referralAddress && account && isSelfReferral(account, referralAddress)) {
      console.log("Self-referral detected, skipping referral address in swap");
    }

    const transaction = await executeSwap({
      quote,
      value: value,
      account,
      fromToken,
      referrerAddress,
    });

    return {
      transactionHash: transaction.transactionHash,
    };
  }
);

// Refresh all balances after swap
export const refreshBalancesAfterSwap = createAsyncThunk(
  "swap/refreshBalancesAfterSwap",
  async ({
    fromToken,
    toToken,
    account,
  }: {
    fromToken: TokenType | null;
    toToken: TokenType | null;
    account: string;
  }) => {
    if (!account)
      return { fromTokenBalance: "0", toTokenBalance: "0", nativeBalance: "0" };

    try {
      const swapManager = createSwapManager();

      // Get native balance
      const nativeBalance = await swapManager.getTokenBalance(
        ZeroAddress,
        account,
        18
      );
      const nativeBalanceFormatted = ethers.formatEther(nativeBalance);

      // Get from token balance
      let fromTokenBalance = "0";
      if (fromToken && fromToken.address !== ZeroAddress) {
        const balance = await swapManager.getTokenBalance(
          fromToken.address,
          account,
          fromToken.decimals
        );
        fromTokenBalance = ethers.formatUnits(balance, fromToken.decimals);
      }

      // Get to token balance
      let toTokenBalance = "0";
      if (toToken && toToken.address !== ZeroAddress) {
        const balance = await swapManager.getTokenBalance(
          toToken.address,
          account,
          toToken.decimals
        );
        toTokenBalance = ethers.formatUnits(balance, toToken.decimals);
      }

      return {
        fromTokenBalance,
        toTokenBalance,
        nativeBalance: nativeBalanceFormatted,
      };
    } catch (error) {
      console.error("Error refreshing balances after swap:", error);
      return { fromTokenBalance: "0", toTokenBalance: "0", nativeBalance: "0" };
    }
  }
);

export const getAllChains = createAsyncThunk("swap/getAllChains", async () => {
  const response = await fetch(
    "https://api.rubic.exchange/api/v2/tokens/allchains"
  );
  const data = await response.json();
  return data || [];
});

export const getAvailableTokensFromChain = createAsyncThunk(
  "swap/getAvailableTokensFromChain",
  async (chain: TokenType) => {
    const response = await fetch(
      `https://api.rubic.exchange/api/v2/tokens/?page=1&pageSize=200&network=${chain.blockchainNetwork}`
    );
    const data = await response.json();
    return data.results || [];
  }
);

export const getTokenPrice = createAsyncThunk(
  "swap/getTokenPrice",
  async ({
    address,
    blockchainNetwork,
    decimals,
  }: {
    address: string;
    blockchainNetwork: string;
    decimals: number;
    type: "from" | "to";
  }) => {
    const isPulse = (blockchainNetwork || "").toLowerCase() === "pulsechain";
    const resolvedAddress = address === ZeroAddress ? WPLS : address;
    const lower = resolvedAddress.toLowerCase();

    // Shortcut for bridged stables: assume $1
    if (
      lower === USDC.toLowerCase() ||
      lower === USDT.toLowerCase() ||
      lower === DAI.toLowerCase()
    ) {
      return 1;
    }

    // Helper: basic sanity on a price in USD
    const isSuspicious = (v: number) =>
      !Number.isFinite(v) || v <= 0 || v > 1e9;

    // ---- Prefer backend high-precision price on PulseChain ----
    let backendPx = 0;
    if (isPulse) {
      try {
        // Use a larger scale for PLS to avoid quantization (keep scale=1 for expensive tokens like WETH)
        const scale =
          lower === WPLS.toLowerCase()
            ? 10000
            : 1;

        const url =
          `${BackendURL}price/pulsex?` +
          `tokenAddress=${resolvedAddress}` +
          `&precision=18&scale=${scale}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const preciseStr: string | undefined = data?.usd_price_str;
          if (preciseStr && preciseStr.trim().length > 0) {
            const n = Number(preciseStr);
            if (!isSuspicious(n)) backendPx = n;
          }
          if (!backendPx) {
            const n = Number(data?.usd_price ?? 0);
            if (!isSuspicious(n)) backendPx = n;
          }
        }
      } catch {
        // ignore
      }
    }

    // ---- Multi-stable fallback (and cross-check) on PulseChain ----
    // We quote "1 token" -> {USDC, USDT, DAI} and assume bridged stables ≈ $1.
    // Then: if backendPx is missing or deviates wildly from the median, use the median.
    if (isPulse) {
      try {
        const d = Number.isFinite(decimals) ? decimals : 18;
        const oneTokenBase = ethers.parseUnits("1", d).toString();

        const stableInfos = [
          { addr: USDC, dec: 6 },
          { addr: USDT, dec: 6 },
          { addr: DAI,  dec: 18 },
        ];

        const reqs = stableInfos.map((s) =>
          fetch(
            `${BackendURL}quote/pulsex?` +
              `tokenInAddress=${resolvedAddress}` +
              `&tokenOutAddress=${s.addr}` +
              `&amount=${oneTokenBase}` +
              `&allowedSlippage=0.5`
          )
            .then(async (r) => (r.ok ? r.json() : null))
            .then((q) => {
              if (!q) return NaN;
              // Support either shape from the API
              const raw =
                q?.outputAmount ??
                q?.destAmount ??
                q?.destAmount?.toString?.() ??
                "0";
              const out = BigInt(raw || "0");
              const usd = Number(out) / 10 ** s.dec;
              return Number.isFinite(usd) && usd > 0 ? usd : NaN;
            })
            .catch(() => NaN)
        );

        const vals = await Promise.all(reqs);
        const good = vals.filter((x) => Number.isFinite(x) && x > 0) as number[];

        if (good.length) {
          // median helper
          const med = (() => {
            const arr = [...good].sort((a, b) => a - b);
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
          })();

          // If backend is missing or way off vs. median (e.g., routed through a mis‑pegged copy stable), trust median
          const tooFar =
            backendPx === 0 ||
            backendPx / med > 3 || // >3x higher than median
            med / backendPx > 3;   // >3x lower than median

          if (tooFar && !isSuspicious(med)) {
            return med;
          }
        }
      } catch {
        // ignore
      }
    }

    // If backend price looked fine, use it
    if (backendPx && !isSuspicious(backendPx)) {
      return backendPx;
    }

    // ---- Cross-chain final fallback: Rubic (last resort) ----
    try {
      const res = await fetch(
        `https://api.rubic.exchange/api/v2/tokens/price/${blockchainNetwork}/${resolvedAddress}`
      );
      if (res.ok) {
        const data = await res.json();
        const n = Number(data?.usd_price ?? 0);
        if (!isSuspicious(n)) return n;
      }
    } catch {
      // ignore
    }

    return 0;
  }
);



/**
 * Hybrid quote:
 * - PulseX (server) and Piteas (client) in parallel.
 * - Show the first success immediately (optimistic UI).
 * - When both settle, pick the best (highest outputAmount).
 * - Cache for 15s.
 */
export const getQuote = createAsyncThunk(
  "swap/getQuote",
  async (
    {
      tokenInAddress,
      tokenOutAddress,
      amount,
      allowedSlippage,
      fromDecimal,
      account,
    }: {
      tokenInAddress: string;
      tokenOutAddress: string;
      amount: number;
      allowedSlippage: number;
      fromDecimal: number;
      account?: string;
    },
    thunkAPI
  ) => {
    const { rejectWithValue, dispatch } = thunkAPI as any;

    // Convert to base units & cache key
    const amountBase = ethers
      .parseUnits(amount.toString(), fromDecimal)
      .toString();
    const key = `${tokenInAddress}|${tokenOutAddress}|${amountBase}|${allowedSlippage}`;

    // Serve fresh cache (15s)
    const cached = clientCache.get(key);
    if (cached && Date.now() - cached.ts < ClientQuoteTTLms) {
      return cached.data;
    }

    return single.do(key, async () => {
      // --- Build PulseX (server) promise ---
      const serverUrl = `${BackendURL}quote/pulsex?tokenInAddress=${tokenInAddress}&tokenOutAddress=${tokenOutAddress}&amount=${amountBase}&allowedSlippage=${allowedSlippage}`;
      const serverPromise = fetch(serverUrl)
        .then(async (r) => {
          if (!r.ok) throw new Error(await r.text().catch(() => "server error"));
          const data = await r.json();
          (data as any).source = (data as any).source || "pulsex";
          return data;
        });

      // --- Build Piteas (client) promise (skip if over local rate limit) ---
      let piteasPromise: Promise<any> | null = null;
      if (PreferClientPiteasFirst) {
        const acq = limiter.acquire();
        if (acq.ok) {
          piteasPromise = fetchPiteasQuote({
            tokenInAddress,
            tokenOutAddress,
            amountBaseUnits: amountBase,
            allowedSlippage,
            account,
          }).then((data) => {
              (data as any).source = (data as any).source || "piteas";
              return data;
            });
        } else {
          // Notify UI to pause quotes so users don't trigger an hour-long Piteas ban.
          return rejectWithValue({ code: "CLIENT_RATE_LIMIT", retryInMs: acq.waitMs });
        }
      }

      const candidates: Promise<any>[] = [serverPromise];
      if (piteasPromise) candidates.push(piteasPromise);

      // If for some reason we have no candidates, bail
      if (candidates.length === 0) {
        return rejectWithValue({ code: "NO_QUOTE_BACKENDS" });
      }

      // --- Show the first winner as soon as one resolves ---
      try {
        const firstWinner = await Promise.any(candidates);
        if (firstWinner) {
          // Only paint if user hasn't changed tokens/amount
          const s = (thunkAPI.getState() as any).swap as SwapState;
          const sameFrom =
            (s.fromToken?.address?.toLowerCase() ?? "") === (tokenInAddress?.toLowerCase() ?? "") ||
            (s.fromToken?.address === ZeroAddress && tokenInAddress === "PLS");
          const sameTo =
            (s.toToken?.address?.toLowerCase() ?? "") === (tokenOutAddress?.toLowerCase() ?? "") ||
            (s.toToken?.address === ZeroAddress && tokenOutAddress === "PLS");
          const sameAmt = Number(s.fromAmount) === amount;
          const sameSlip = s.slippage === allowedSlippage;
          if (sameFrom && sameTo && sameAmt && sameSlip) {
            dispatch(swapSlice.actions.setQuote(firstWinner));
          }
        }
      } catch {
        // If *all* failed quickly, we'll handle below after allSettled
      }

      // --- When both settle, choose best ---
      const settled = await Promise.allSettled(candidates);
      const successes = settled
        .filter((s): s is PromiseFulfilledResult<any> => s.status === "fulfilled")
        .map((s) => s.value);

      if (successes.length === 0) {
        // Nothing worked
        const firstErr =
          (settled.find((s) => s.status === "rejected") as PromiseRejectedResult)
            ?.reason || "Failed to fetch quotes";
        return rejectWithValue({ code: "NO_QUOTE", message: String(firstErr) });
      }

      // Pick highest outputAmount
      const pickBest = (arr: any[]) => {
        let best = arr[0];
        for (let i = 1; i < arr.length; i++) {
          try {
            const a = BigInt(best?.outputAmount ?? "0");
            const b = BigInt(arr[i]?.outputAmount ?? "0");
            if (b > a) best = arr[i];
          } catch {
            // if parse fails, keep current best
          }
        }
        return best;
      };

      const best = pickBest(successes);
      clientCache.set(key, { ts: Date.now(), data: best });
      return best;
    });
  }
);

export const swapSlice = createSlice({
  name: "swap",
  initialState,
  reducers: {
    setAllChains: (state, action) => {
      state.allChains = action.payload;
    },
    setAvailableTokens: (state, action) => {
      state.availableTokens = action.payload;
    },
    setFromToken: (state, action) => {
      state.fromToken = normalizePulseToken(action.payload);
      resetSwapState();
    },
    setToToken: (state, action) => {
      state.toToken = normalizePulseToken(action.payload);
      resetSwapState();
    },
    setFromAmount: (state, action) => {
      state.fromAmount = action.payload;
      resetSwapState();
    },
    setQuote: (state, action) => {
      const incoming = action.payload as QuoteType | null;

      // Allow clearing
      if (incoming == null) {
        state.quote = null;
        return;
      }

      // If no current quote, set immediately
      if (!state.quote) {
        state.quote = incoming;
        return;
      }

      // Compare outputs; only accept if strictly better by a small threshold
      try {
        const curOut = BigInt(state.quote.outputAmount ?? "0");
        const incOut = BigInt(incoming.outputAmount ?? "0");

        // 5 bps = 0.05% improvement required to avoid tiny oscillations
        const MIN_IMPROVEMENT_BPS = 5;           // number
        const SCALE = BigInt(10000);             // BigInt(10000) instead of 10000n

        const improved =
          incOut * SCALE > curOut * (SCALE + BigInt(MIN_IMPROVEMENT_BPS));

        if (improved) {
          state.quote = incoming;
        }
        // if not improved, keep the current quote
      } catch {
        // If parsing fails, be conservative: keep current quote
      }
    },
    setSlippage: (state, action) => {
      state.slippage = action.payload;
    },
    // Set balances
    setFromTokenBalance: (state, action) => {
      state.fromTokenBalance = action.payload;
    },
    setToTokenBalance: (state, action) => {
      state.toTokenBalance = action.payload;
    },
    setNativeBalance: (state, action) => {
      state.nativeBalance = action.payload;
    },
    // Set transaction hash
    setTransactionHash: (state, action) => {
      state.transactionHash = action.payload;
    },
    // Reset swap state
    resetSwapState: (state) => {
      state.isSwapping = false;
      state.isApproving = false;
      state.transactionHash = null;
      state.quote = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllChains.pending, (state) => {})
      .addCase(getAllChains.fulfilled, (state, action) => {
        const pulseIndex = action.payload.findIndex(
          (chain: any) => chain.symbol === "PLS"
        );
        if (pulseIndex > -1) {
          const [pulseChain] = action.payload.splice(pulseIndex, 1);
          state.allChains = [pulseChain, ...action.payload];
        } else {
          state.allChains = action.payload;
        }
      })
      .addCase(getAllChains.rejected, (state, action) => {
        console.error("Failed to get all chains:", action.error);
      });

    builder
      .addCase(getAvailableTokensFromChain.pending, (state) => {})
      .addCase(getAvailableTokensFromChain.fulfilled, (state, action) => {
        state.availableTokens = action.payload;
      })
      .addCase(getAvailableTokensFromChain.rejected, (state, action) => {
        console.error("Failed to get available tokens:", action.error);
      });

    builder
      .addCase(getQuote.pending, (state) => {})
      .addCase(getQuote.fulfilled, (state, action) => {
        if (!action.payload || action.payload.error) return;

          const isFromTokenValid =
            state.fromToken?.address.toLowerCase() ===
              action.meta.arg.tokenInAddress.toLowerCase() ||
            (state.fromToken?.address === ZeroAddress &&
              action.meta.arg.tokenInAddress === "PLS");

          const isToTokenValid =
            state.toToken?.address.toLowerCase() ===
              action.meta.arg.tokenOutAddress.toLowerCase() ||
            (state.toToken?.address === ZeroAddress &&
              action.meta.arg.tokenOutAddress === "PLS");

          const otherValidation =
            state.fromToken?.decimals === action.meta.arg.fromDecimal &&
            state.slippage === action.meta.arg.allowedSlippage &&
            Number(state.fromAmount) === action.meta.arg.amount;

        if (!(isFromTokenValid && isToTokenValid && otherValidation)) return;

        // Only replace if strictly better (higher outputAmount)
        try {
          const incoming = BigInt(action.payload?.outputAmount ?? "0");
          const current  = BigInt(state.quote?.outputAmount ?? "0");
          if (!state.quote || incoming > current) {
            state.quote = action.payload;
          }
        } catch {
          // if parsing fails, be conservative: keep the current quote
        }
      })
      .addCase(getQuote.rejected, (state, action) => {
        console.error("Failed to get quote:", action.error);
      });

    builder
      .addCase(approveTokenAction.pending, (state) => {
        state.isApproving = true;
      })
      .addCase(approveTokenAction.fulfilled, (state, action) => {
        state.isApproving = false;
      })
      .addCase(approveTokenAction.rejected, (state, action) => {
        state.isApproving = false;
      });

    builder
      .addCase(executeSwapAction.pending, (state) => {
        state.isSwapping = true;
      })
      .addCase(executeSwapAction.fulfilled, (state, action) => {
        state.isSwapping = false;
        state.transactionHash = action.payload.transactionHash;
        state.isApproved = false;
        state.isApproving = false;
        state.quote = null;
        state.fromAmount = "";
      })
      .addCase(executeSwapAction.rejected, (state, action) => {
        state.isSwapping = false;
      });

    builder
      .addCase(getTokenPrice.pending, (state) => {})
      .addCase(getTokenPrice.fulfilled, (state, action) => {
        if (action.meta.arg.type === "from") {
          state.fromToken = {
            ...state.fromToken,
            price: action.payload,
          } as TokenType;
        }
        if (action.meta.arg.type === "to") {
          state.toToken = {
            ...state.toToken,
            price: action.payload,
          } as TokenType;
        }
      })
      .addCase(getTokenPrice.rejected, (state, action) => {
        console.error("Failed to get token price:", action.error);
      });

    builder
      .addCase(checkTokenAllowance.pending, (state) => {
        state.isApproving = false;
      })
      .addCase(checkTokenAllowance.fulfilled, (state, action) => {
        state.isApproved = action.payload?.hasAllowance || false;
      })
      .addCase(checkTokenAllowance.rejected, (state, action) => {
        state.isApproved = false;
      });

    builder
      .addCase(getTokenBalance.fulfilled, (state, action) => {})
      .addCase(getTokenBalance.rejected, (state, action) => {
        console.error("Failed to get token balance:", action.error);
      });

    builder
      .addCase(getNativeBalance.fulfilled, (state, action) => {
        state.nativeBalance = action.payload;
      })
      .addCase(getNativeBalance.rejected, (state, action) => {
        console.error("Failed to get native balance:", action.error);
      });

    builder
      .addCase(refreshBalancesAfterSwap.pending, (state) => {})
      .addCase(refreshBalancesAfterSwap.fulfilled, (state, action) => {
        state.fromTokenBalance = action.payload.fromTokenBalance;
        state.toTokenBalance = action.payload.toTokenBalance;
        state.nativeBalance = action.payload.nativeBalance;
      })
      .addCase(refreshBalancesAfterSwap.rejected, (state, action) => {
        console.error("Failed to refresh balances after swap:", action.error);
      });
  },
});

export const {
  setAllChains,
  setAvailableTokens,
  setFromToken,
  setToToken,
  setFromAmount,
  setQuote,
  setSlippage,
  setFromTokenBalance,
  setToTokenBalance,
  setNativeBalance,
  setTransactionHash,
  resetSwapState,
} = swapSlice.actions;

export default swapSlice.reducer;

// ---- Canonical address/decimals fixes for PulseChain ----
function normalizePulseToken(t: TokenType | null): TokenType | null {
  if (!t) return t;
  const net = (t.blockchainNetwork || t.network || '').toLowerCase();
  if (net !== 'pulsechain') return t;

  try {
    const sym = (t.symbol || '').toUpperCase();
    const canon: Record<string, { address: string; decimals: number }> = {
      WPLS: { address: WPLS, decimals: 18 },
      USDC: { address: USDC, decimals: 6 },
      DAI:  { address: DAI,  decimals: 18 },
      WETH: { address: WETH, decimals: 18 },
      USDT: { address: USDT, decimals: 6 },
    };
    if (canon[sym]) {
      const target = canon[sym];
      const lowerA = (t.address || '').toLowerCase();
      const lowerB = (target.address || '').toLowerCase();
      if (lowerA !== lowerB || t.decimals !== target.decimals) {
        return { ...t, address: target.address, decimals: target.decimals } as TokenType;
      }
    }
  } catch {}
  return t;
}
