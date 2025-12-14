import {
  createAsyncThunk,
  createSelector,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { QuoteType, TokenType, UnsignedQuoteType } from "../types/Swap";
import { ethers } from "ethers";
import { isSelfReferral, getStoredReferralCode } from "../utils/referralUtils";
import { ZeroAddress, AffiliateRouterAddress, BackendURL } from "../const/swap";
import { PulsexConfig } from "../config/pulsex";
import {
  approveToken,
  executeSwap,
  getTokenAllowance,
  needsApproval,
  createSwapManager,
} from "../contracts/SwapManager";
import { createMulticall } from "../contracts/Multicall";
import { RootState } from "./store";
import { fetchReferralPromo } from "./referralSlice";
import { fetchPiteasQuoteClient } from "../utils/piteasQuote";
import { requestQuoteAttestation } from "../utils/quoteAttestation";
import { validateQuoteIntegrity } from "../utils/quoteValidation";
import { decodeSwapRouteSummary } from "../utils/routeEncoding";
import { normalizeAmountInput, areAmountsEqual, truncateToDecimals } from "../utils/amount";
import { isPulseChainToken } from "../utils/token";
import { getPulsechainWeb3 } from "../rpc/pulsechainProviders";
import ERC20ABI from "../abis/ERC20.json";
import { AbiItem } from "web3-utils";

const getPublicAssetUrl = (assetPath: string) => {
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedAsset = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
  return `${normalizedBase}${normalizedAsset}`;
};

const ZERO_ADDRESS_LOWER = ZeroAddress.toLowerCase();
const WPLS_ADDRESS_LOWER = PulsexConfig.WPLSAddress?.toLowerCase() ?? "";
const BPS_DENOMINATOR = 10_000n;
const CUSTOM_TOKEN_STORAGE_KEY = "swapCustomTokens";

const clampSlippageBps = (slippage: number): number => {
  if (!Number.isFinite(slippage)) return 0;
  const bps = Math.round(slippage * 100);
  return Math.max(0, Math.min(10_000, bps));
};

const applySlippageToAmount = (amount: string, slippageBps: number): string => {
  const amountBig = BigInt(amount);
  const safeBps = BigInt(Math.max(0, Math.min(10_000, slippageBps)));
  return ((amountBig * (BPS_DENOMINATOR - safeBps)) / BPS_DENOMINATOR).toString();
};

const normalizeAddressLower = (address?: string | null) =>
  address ? address.toLowerCase() : "";

const dedupeTokens = (tokens: TokenType[]) => {
  const seen = new Set<string>();
  const unique: TokenType[] = [];
  for (const token of tokens) {
    const addr = normalizeAddressLower(token.address);
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    unique.push(token);
  }
  return unique;
};

const persistCustomTokens = (tokens: TokenType[]) => {
  try {
    if (typeof localStorage === "undefined") return;
    const payload = tokens.map((t) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      chainId: t.chainId,
      blockchainNetwork: t.blockchainNetwork,
      network: t.network,
      logoURI: t.logoURI,
      origin: t.origin,
      tier: t.tier,
      isCustom: true,
    }));
    localStorage.setItem(CUSTOM_TOKEN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

const readCustomTokensFromStorage = (): TokenType[] => {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(CUSTOM_TOKEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t) => ({
        ...t,
        address: typeof t.address === "string" ? t.address : "",
        symbol: typeof t.symbol === "string" ? t.symbol : "",
        name: typeof t.name === "string" ? t.name : "",
        decimals: Number(t.decimals) || 0,
        chainId: t.chainId ?? 369,
        blockchainNetwork: t.blockchainNetwork ?? "pulsechain",
        network: t.network ?? "PulseChain",
        tier: t.tier ?? "unverified",
        origin: t.origin ?? "custom",
        isCustom: true,
      }))
      .filter((t) => normalizeAddressLower(t.address));
  } catch {
    return [];
  }
};

interface SwapState {
  availableTokens: TokenType[];
  fromToken: TokenType | null;
  toToken: TokenType | null;
  fromAmount: string;
  quote: QuoteType | null;
  quoteSource: QuoteSource | null;
  slippage: number;
  // Balance state
  fromTokenBalance: string;
  toTokenBalance: string;
  nativeBalance: string;
  tokenBalances: Record<string, string>;
  tokenBalancesAccount: string | null;
  tokenBalancesRequestId: string | null;
  isTokenBalancesLoading: boolean;
  // Swap execution state
  isApproving: boolean;
  isSwapping: boolean;
  isApproved: boolean;
  // Transaction tracking
  transactionHash: string | null;
  // Quote loading states
  isPulseXLoading: boolean;
  isPiteamsLoading: boolean;
  hasCalledPulseXOnce: boolean;
  // Parameter tracking for PulseX calls
  lastPulseXParams: {
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: string;
    allowedSlippage: number;
  } | null;
  latestAllowanceRequestId: string | null;
  areTokensLoading: boolean;
  customTokens: TokenType[];
  customTokensHydrated: boolean;
  isImportingCustomToken: boolean;
  importingAddress: string | null;
}

type QuoteRequestSnapshot = {
  tokenInAddress: string;
  tokenOutAddress: string;
  amount: string;
  allowedSlippage: number;
  fromDecimal: number;
};

export type QuoteSource = "pulsex" | "piteas";

const initialState: SwapState = {
  availableTokens: [],
  fromToken: null,
  toToken: null,
  fromAmount: "",
  quote: null,
  quoteSource: null,
  slippage: 0.5,
  // Balance state
  fromTokenBalance: "0",
  toTokenBalance: "0",
  nativeBalance: "0",
  tokenBalances: {},
  tokenBalancesAccount: null,
  tokenBalancesRequestId: null,
  isTokenBalancesLoading: false,
  // Swap execution state
  isApproving: false,
  isSwapping: false,
  isApproved: false,
  // Transaction tracking
  transactionHash: null,
  // Quote loading states
  isPulseXLoading: false,
  isPiteamsLoading: false,
  hasCalledPulseXOnce: false,
  // Parameter tracking for PulseX calls
  lastPulseXParams: null,
  latestAllowanceRequestId: null,
  areTokensLoading: false,
  customTokens: [],
  customTokensHydrated: false,
  isImportingCustomToken: false,
  importingAddress: null,
};

const resetSwapTransientState = (state: SwapState) => {
  state.isSwapping = false;
  state.isApproving = false;
  state.transactionHash = null;
  state.hasCalledPulseXOnce = false;
  state.lastPulseXParams = null;
  state.latestAllowanceRequestId = null;
   // Clear any lingering quote/source when inputs change to avoid stale UI
  state.quote = null;
  state.quoteSource = null;
};

const isNativeAddress = (address: string) => {
  if (!address) return false;
  return (
    address === ZERO_ADDRESS_LOWER ||
    address === "pls" ||
    address === "0x0" ||
    (WPLS_ADDRESS_LOWER !== "" && address === WPLS_ADDRESS_LOWER)
  );
};

const normalizeAddress = (address?: string | null) =>
  address ? address.toLowerCase() : "";

const matchesRequestedAddress = (
  tokenAddress: string | null | undefined,
  requestedAddress: string
) => {
  if (!tokenAddress) return false;
  const normalizedToken = normalizeAddress(tokenAddress);
  const normalizedRequested = normalizeAddress(requestedAddress);

  if (!normalizedToken || !normalizedRequested) return false;
  if (normalizedToken === normalizedRequested) return true;

  return (
    isNativeAddress(normalizedToken) && isNativeAddress(normalizedRequested)
  );
};

const doesQuoteMatchSnapshot = (
  state: SwapState,
  snapshot: QuoteRequestSnapshot
) => {
  const fromMatches = matchesRequestedAddress(
    state.fromToken?.address,
    snapshot.tokenInAddress
  );
  const toMatches = matchesRequestedAddress(
    state.toToken?.address,
    snapshot.tokenOutAddress
  );

  if (!fromMatches || !toMatches) return false;
  if (state.fromToken?.decimals !== snapshot.fromDecimal) return false;
  if (state.slippage !== snapshot.allowedSlippage) return false;

  return areAmountsEqual(state.fromAmount, snapshot.amount);
};

export const compareQuotes = (
  a: QuoteType,
  b: QuoteType
): "a" | "b" | "tie" => {
  const outputA = BigInt(a.outputAmount);
  const outputB = BigInt(b.outputAmount);

  if (outputA > outputB) return "a";
  if (outputB > outputA) return "b";

  const minOutA = BigInt(a.minAmountOut);
  const minOutB = BigInt(b.minAmountOut);

  if (minOutA > minOutB) return "a";
  if (minOutB > minOutA) return "b";

  return "tie";
};

export const updateBestQuote = (
  current: { quote: QuoteType | null; source: QuoteSource | null },
  candidate: QuoteType,
  source: QuoteSource
): { quote: QuoteType; source: QuoteSource } => {
  if (!current.quote || !current.source) {
    return { quote: candidate, source };
  }
  const winner = compareQuotes(candidate, current.quote);
  return winner === "a"
    ? { quote: candidate, source }
    : { quote: current.quote, source: current.source };
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

export const hydrateCustomTokens = createAsyncThunk(
  "swap/hydrateCustomTokens",
  async () => {
    return readCustomTokensFromStorage();
  }
);

export const importCustomToken = createAsyncThunk<
  TokenType,
  { address: string },
  { state: RootState }
>(
  "swap/importCustomToken",
  async ({ address }, { getState }) => {
    const normalized = normalizeAddressLower(address);
    if (!normalized || !ethers.isAddress(address)) {
      throw new Error("Enter a valid token address.");
    }
    if (normalized === ZERO_ADDRESS_LOWER) {
      throw new Error("Native token cannot be imported as custom.");
    }

    const state = getState().swap;
    const allKnown = dedupeTokens([
      ...state.availableTokens,
      ...state.customTokens,
    ]);
    const existing = allKnown.find(
      (t) => normalizeAddressLower(t.address) === normalized
    );
    if (existing) {
      return { ...existing, isCustom: true, origin: existing.origin ?? "custom" };
    }

    const checksumAddress = ethers.getAddress(address);
    const web3 = getPulsechainWeb3();
    const contract = new web3.eth.Contract(ERC20ABI as unknown as AbiItem[], checksumAddress);

    try {
      const [symbol, name, decimals] = await Promise.all([
        contract.methods.symbol().call(),
        contract.methods.name().call(),
        contract.methods.decimals().call(),
      ]);

      const decimalsNum = Number(decimals);
      if (!Number.isFinite(decimalsNum) || decimalsNum < 0 || decimalsNum > 36) {
        throw new Error("Invalid token decimals.");
      }

      const fallbackSymbol = ethers.getAddress(address).slice(0, 6);
      const safeSymbol = symbol || fallbackSymbol;
      const safeName = name || safeSymbol || "Custom Token";

      const token: TokenType = {
        address: checksumAddress,
        symbol: safeSymbol,
        name: safeName,
        decimals: decimalsNum,
        chainId: 369,
        blockchainNetwork: "pulsechain",
        network: "PulseChain",
        tier: "unverified",
        origin: "custom",
        isCustom: true,
      };

      return token;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import token.";
      throw new Error(message);
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

// Get token balances for multiple tokens using Multicall
export const getTokenBalancesBatch = createAsyncThunk(
  "swap/getTokenBalancesBatch",
  async ({
    tokens,
    account,
  }: {
    tokens: TokenType[];
    account: string;
  }) => {
    const normalizedAccount = account?.toLowerCase();
    if (!normalizedAccount || tokens.length === 0) {
      return { balances: {}, account: normalizedAccount };
    }

    try {
      const multicallManager = createMulticall();

      const chunkSize = 150;
      const balanceMap: Record<string, string> = {};

      for (let start = 0; start < tokens.length; start += chunkSize) {
        const chunk = tokens.slice(start, start + chunkSize);
        const chunkBalances = await multicallManager.getTokenBalances({
          tokens: chunk,
          account: normalizedAccount,
        });

        for (let i = 0; i < chunk.length; i++) {
          const token = chunk[i];
          const tokenAddress = (token.address ?? "").toLowerCase();
          balanceMap[tokenAddress] = chunkBalances[i] ?? "0";
        }
      }

      return { balances: balanceMap, account: normalizedAccount };
    } catch (error) {
      console.error("Error getting token balances batch:", error);
      throw error;
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
    chainId,
  }: {
    tokenAddress: string;
    amount: string;
    decimals: number;
    userAddress: string;
    chainId?: number;
  }) => {
    if (tokenAddress === ZeroAddress) {
      return { hasAllowance: true, allowance: "0" };
    }

    const isApproved = await needsApproval(
      tokenAddress,
      userAddress,
      AffiliateRouterAddress,
      amount,
      decimals,
      chainId
    );

    return {
      hasAllowance: isApproved,
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
    chainId,
  }: {
    tokenAddress: string;
    account: string;
    amount: string;
    decimals: number;
    chainId?: number;
  }) => {
    if (tokenAddress === ZeroAddress) {
      throw new Error("Native token does not require approval");
    }

    const transaction = await approveToken({
      tokenAddress,
      spenderAddress: AffiliateRouterAddress,
      account,
      amount,
      decimals,
    });

    const hasAllowance = await needsApproval(
      tokenAddress,
      account,
      AffiliateRouterAddress,
      amount,
      decimals,
      chainId
    );

    return {
      transactionHash: transaction.transactionHash,
      hasAllowance,
    };
  }
);

// Execute swap
export const executeSwapAction = createAsyncThunk(
  "swap/executeSwapAction",
  async (
    {
      quote,
      value,
      account,
      fromToken,
    }: {
      quote: QuoteType;
      value: string;
      account: string;
      fromToken: TokenType;
    },
    thunkAPI
  ) => {
    const state = thunkAPI.getState() as RootState;

    let referralAddress = state.referral.referralAddress?.address;

    if (!referralAddress) {
      const code = getStoredReferralCode();
      if (code) {
        try {
          const resp = await fetch(
            `${BackendURL}referral/address?referralCode=${encodeURIComponent(code)}`
          );
          if (resp.ok) {
            const data = await resp.json();
            referralAddress = (data?.address ||
              data?.referralAddress ||
              undefined) as string | undefined;
          }
        } catch {
          // Ignore lookup failures and continue without a referrer
        }
      }
    }

    const selectReferrer = (address?: string | null): string | undefined => {
      if (!address) {
        return undefined;
      }
      if (address.toLowerCase() === ZERO_ADDRESS_LOWER) {
        return undefined;
      }
      if (isSelfReferral(account, address)) {
        return undefined;
      }
      return address;
    };

    let candidateReferrer = selectReferrer(referralAddress);

    const promo = state.referral.promo;
    const hasBoundReferrer =
      promo.firstReferrer &&
      promo.firstReferrer.toLowerCase() !== ZERO_ADDRESS_LOWER;

    if (hasBoundReferrer) {
      candidateReferrer = selectReferrer(promo.firstReferrer);
    }

    if (referralAddress && account && isSelfReferral(account, referralAddress)) {
      console.log("Self-referral detected, skipping referral address in swap");
    }

    const transaction = await executeSwap({
      quote,
      value,
      account,
      fromToken,
      referrerAddress: candidateReferrer,
    });

    if (account) {
      thunkAPI.dispatch(fetchReferralPromo(account));
    }

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
      const web3 = getPulsechainWeb3();

      const nativeBalancePromise = web3.eth.getBalance(account);

      const formatNative = async () => ethers.formatEther(await nativeBalancePromise);

      const getBalanceForToken = async (token: TokenType | null) => {
        if (!token) return "0";
        if (token.address === ZeroAddress) {
          return formatNative();
        }

        const contract = new web3.eth.Contract(
          ERC20ABI as unknown as AbiItem[],
          token.address
        );
        const balance: string = await contract.methods.balanceOf(account).call();
        return ethers.formatUnits(balance, token.decimals);
      };

      const [nativeBalance, fromTokenBalance, toTokenBalance] = await Promise.all([
        formatNative(),
        getBalanceForToken(fromToken),
        getBalanceForToken(toToken),
      ]);

      return {
        fromTokenBalance,
        toTokenBalance,
        nativeBalance,
      };
    } catch (error) {
      console.error("Error refreshing balances after swap:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to refresh balances after swap");
    }
  }
);

export const loadPulsexTokens = createAsyncThunk(
  "swap/loadPulsexTokens",
  async () => {
    const response = await fetch(getPublicAssetUrl("pulsex-tokens.json"), {
      cache: "no-cache",
    });
    if (!response.ok) {
      throw new Error(`Failed to load PulseX tokens (${response.status})`);
    }
    const data = (await response.json()) as TokenType[];
    return data || [];
  }
);

export const getTokenPrice = createAsyncThunk<
  number,
  { address: string; blockchainNetwork?: string; chainId?: number; type: "from" | "to" },
  { rejectValue: string }
>(
  "swap/getTokenPrice",
  async ({ address, blockchainNetwork, chainId }, { rejectWithValue }) => {
    if (!isPulseChainToken({ blockchainNetwork, chainId })) {
      return rejectWithValue("Price lookup only supported on PulseChain");
    }

    try {
      const response = await fetch(`${BackendURL}token/price?address=${address}`);
      if (!response.ok) {
        return rejectWithValue(`Price request failed (${response.status})`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return rejectWithValue("Unexpected price response format");
      }

      const data = await response.json();
      if (typeof data?.usd_price !== "number") {
        return rejectWithValue("Price response missing usd_price");
      }

      return data.usd_price;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch token price";
      return rejectWithValue(message);
    }
  }
);

// Get PulseX quote (fast API)
export const getPulseXQuote = createAsyncThunk<
  QuoteType | { error: unknown },
  {
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: string;
    allowedSlippage: number;
    fromDecimal: number;
  }
>(
  "swap/getPulseXQuote",
  async ({
    tokenInAddress,
    tokenOutAddress,
    amount,
    allowedSlippage,
    fromDecimal,
  }) => {
    const normalizedAmount = normalizeAmountInput(amount);
    const safeAmount = truncateToDecimals(normalizedAmount, fromDecimal);

    const params = new URLSearchParams({
      tokenInAddress,
      tokenOutAddress,
      amount: ethers.parseUnits(safeAmount, fromDecimal).toString(),
      allowedSlippage: allowedSlippage.toString(),
      fromDecimal: fromDecimal.toString(),
    });
    const response = await fetch(
      `${BackendURL}quote/pulsex?${params.toString()}`
    );
    const payload = await response.json();

    if (
      payload &&
      typeof payload === "object" &&
      "outputAmount" in payload &&
      payload.outputAmount != null
    ) {
      return {
        ...payload,
        outputAmount: payload.outputAmount.toString(),
      } as QuoteType;
    }

    return payload as { error: unknown };
  }
);

// Get piteams quote (slower but more accurate API)
export const getPiteamsQuote = createAsyncThunk<
  QuoteType,
  {
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: string;
    allowedSlippage: number;
    fromDecimal: number;
    account?: string | null;
  },
  { state: RootState }
>(
  "swap/getPiteamsQuote",
  async (
    {
      tokenInAddress,
      tokenOutAddress,
      amount,
      allowedSlippage,
      fromDecimal,
      account,
    },
    { getState }
  ) => {
    const { swap, referral } = getState();
    const { fromToken, toToken } = swap;

    if (!fromToken || !toToken) {
      throw new Error("Select tokens before requesting a quote.");
    }

    const normalizedAmount = normalizeAmountInput(amount);
    const amountInWei = ethers
      .parseUnits(normalizedAmount, fromDecimal)
      .toString();

    const rawQuote = await fetchPiteasQuoteClient({
      tokenInAddress,
      tokenOutAddress,
      amount: amountInWei,
      allowedSlippage,
      account: account ?? undefined,
    });

    const decodedRoute = decodeSwapRouteSummary(rawQuote.calldata);

    const fromMatches = matchesRequestedAddress(
      decodedRoute.tokenIn,
      tokenInAddress
    );
    const toMatches = matchesRequestedAddress(
      decodedRoute.tokenOut,
      tokenOutAddress
    );

    if (!fromMatches || !toMatches) {
      throw new Error("Quote tokens do not match the requested pair.");
    }

    if (decodedRoute.amountIn !== amountInWei) {
      throw new Error("Quote amount does not match the requested value.");
    }

    const slippageBps = clampSlippageBps(allowedSlippage);
    const uiMinAmountOut = applySlippageToAmount(
      rawQuote.outputAmount,
      slippageBps
    );

    if (BigInt(decodedRoute.minAmountOut) < BigInt(uiMinAmountOut)) {
      throw new Error("Quote minimum output violates slippage tolerance.");
    }

    const integrity = await requestQuoteAttestation({
      quote: rawQuote,
      context: {
        tokenInAddress: fromToken.address,
        tokenOutAddress: toToken.address,
        amountInWei,
        minAmountOutWei: uiMinAmountOut,
        slippageBps,
        recipient: account ?? ZeroAddress,
        routerAddress: AffiliateRouterAddress,
        chainId: fromToken.chainId ?? 369,
        referrerAddress: referral.referralAddress?.address,
      },
    });

    return {
      ...rawQuote,
      integrity,
    };
  }
);

// Main quote function that handles dual API calls
export const getQuote = createAsyncThunk<
  QuoteType,
  {
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: string;
    allowedSlippage: number;
    fromDecimal: number;
    account?: string | null;
  },
  { state: RootState }
>(
  "swap/getQuote",
  async ({
    tokenInAddress,
    tokenOutAddress,
    amount,
    allowedSlippage,
    fromDecimal,
    account,
  }, { dispatch, getState }) => {
    let normalizedAmount: string;
    try {
      normalizedAmount = normalizeAmountInput(amount);
    } catch (error) {
      dispatch(setQuote(null));
      throw error;
    }
    const requestSnapshot: QuoteRequestSnapshot = {
      tokenInAddress,
      tokenOutAddress,
      amount: normalizedAmount,
      allowedSlippage,
      fromDecimal,
    };
    const state = getState();
    const validationContext = {
      fromToken: state.swap.fromToken,
      toToken: state.swap.toToken,
      fromAmount: normalizedAmount,
      slippage: allowedSlippage,
    };

    const ensureValidQuote = (quote: QuoteType) => {
      try {
        const validation = validateQuoteIntegrity(quote, validationContext);
        return {
          ...quote,
          decodedRoute: validation.decodedRoute,
          uiMinAmountOut: validation.uiMinAmountOut,
          verifiedAt: validation.checkedAt,
        };
      } catch (error) {
        dispatch(setQuote(null));
        throw error;
      }
    };

    const quotePromises = [
      {
        source: "pulsex" as const,
        promise: dispatch(getPulseXQuote({
          tokenInAddress,
          tokenOutAddress,
          amount,
          allowedSlippage,
          fromDecimal,
        })).unwrap(),
      },
      {
        source: "piteas" as const,
        promise: dispatch(getPiteamsQuote({
          tokenInAddress,
          tokenOutAddress,
          amount,
          allowedSlippage,
          fromDecimal,
          account,
        })).unwrap(),
      },
    ];

    let best = { quote: null as QuoteType | null, source: null as QuoteSource | null };

    const considerQuote = (quote: QuoteType, source: QuoteSource) => {
      const validated = ensureValidQuote(quote);
      const nextBest = updateBestQuote(best, validated, source);
      if (nextBest.quote !== best.quote) {
        best = nextBest;
        if (nextBest.source) {
          dispatch(
            applyQuoteIfCurrent({
              quote: validated,
              params: requestSnapshot,
              source: nextBest.source,
            })
          );
        }
      }
    };

    let hasSuccess = false;

    await Promise.all(
      quotePromises.map(({ promise, source }) =>
        promise
          .then((quote) => {
            if ("error" in quote) {
              const err =
                quote.error instanceof Error
                  ? quote.error
                  : new Error("Quote API failed");
              throw err;
            }
            try {
              considerQuote(quote as QuoteType, source);
              hasSuccess = true;
            } catch (error) {
              console.error("Quote validation failed:", error);
            }
          })
          .catch((error) => {
            console.error("Quote provider failed:", error);
          })
      )
    );

    dispatch(setLastPulseXParams({
      tokenInAddress,
      tokenOutAddress,
      amount: normalizedAmount,
      allowedSlippage,
    }));

    if (!hasSuccess || !best.quote) {
      throw new Error("All quote providers failed");
    }

    return best.quote;
  }
);

export const swapSlice = createSlice({
  name: "swap",
  initialState,
  reducers: {
    setFromToken: (state, action) => {
      state.fromToken = action.payload;
      resetSwapTransientState(state);
    },
    setToToken: (state, action) => {
      state.toToken = action.payload;
      resetSwapTransientState(state);
    },
    setFromAmount: (state, action) => {
      state.fromAmount = action.payload;
      resetSwapTransientState(state);
    },
    setQuote: (state, action) => {
      state.quote = action.payload;
      if (!action.payload) {
        state.quoteSource = null;
      }
    },
    applyQuoteIfCurrent: (
      state,
      action: PayloadAction<{ quote: QuoteType; params: QuoteRequestSnapshot; source: QuoteSource }>
    ) => {
      if (doesQuoteMatchSnapshot(state, action.payload.params)) {
        state.quote = action.payload.quote;
        state.quoteSource = action.payload.source;
      }
    },
    setSlippage: (state, action) => {
      state.slippage = action.payload;
      resetSwapTransientState(state);
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
    setTokenBalances: (state, action: PayloadAction<{ balances: Record<string, string>; account?: string | null }>) => {
      state.tokenBalances = action.payload.balances;
      state.tokenBalancesAccount = action.payload.account ?? null;
      state.isTokenBalancesLoading = false;
    },
    clearTokenBalances: (state) => {
      state.tokenBalances = {};
      state.tokenBalancesAccount = null;
      state.tokenBalancesRequestId = null;
      state.isTokenBalancesLoading = false;
    },
    // Set transaction hash
    setTransactionHash: (state, action) => {
      state.transactionHash = action.payload;
    },
    // Reset swap state
    resetSwapState: (state) => {
      resetSwapTransientState(state);
    },
    clearApprovalState: (state) => {
      state.isApproved = false;
      state.isApproving = false;
      state.latestAllowanceRequestId = null;
    },
    // Quote loading states
    setPulseXLoading: (state, action) => {
      state.isPulseXLoading = action.payload;
    },
    setPiteamsLoading: (state, action) => {
      state.isPiteamsLoading = action.payload;
    },
    setHasCalledPulseXOnce: (state, action) => {
      state.hasCalledPulseXOnce = action.payload;
    },
    setLastPulseXParams: (state, action) => {
      state.lastPulseXParams = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPulsexTokens.pending, (state) => {
        state.areTokensLoading = true;
      })
      .addCase(loadPulsexTokens.fulfilled, (state, action) => {
        state.availableTokens = action.payload.map((token) => ({
          ...token,
          blockchainNetwork: token.blockchainNetwork ?? "pulsechain",
          network: token.network ?? "PulseChain",
          image: token.image ?? token.logoURI,
        }));
        state.areTokensLoading = false;
      })
      .addCase(loadPulsexTokens.rejected, (state, action) => {
        console.error("Failed to load PulseX tokens:", action.error);
        state.areTokensLoading = false;
      });

    builder
      .addCase(getPulseXQuote.pending, (state) => {
        state.isPulseXLoading = true;
      })
      .addCase(getPulseXQuote.fulfilled, (state, action) => {
        state.isPulseXLoading = false;
        // Quote will be set by the main getQuote function
      })
      .addCase(getPulseXQuote.rejected, (state, action) => {
        state.isPulseXLoading = false;
        console.error("Failed to get PulseX quote:", action.error);
      });

    builder
      .addCase(getPiteamsQuote.pending, (state) => {
        state.isPiteamsLoading = true;
      })
      .addCase(getPiteamsQuote.fulfilled, (state, action) => {
        state.isPiteamsLoading = false;
        // Quote comparison and update is handled by the main getQuote function
      })
      .addCase(getPiteamsQuote.rejected, (state, action) => {
        state.isPiteamsLoading = false;
        console.error("Failed to get piteams quote:", action.error);
      });

    builder
      .addCase(getQuote.pending, (state) => {
        // Loading states are managed in the thunk itself
      })
      .addCase(getQuote.fulfilled, (state, action) => {
        if (doesQuoteMatchSnapshot(state, action.meta.arg)) {
          state.quote = action.payload;
        }
        // Reset loading states
        state.isPulseXLoading = false;
        state.isPiteamsLoading = false;
      })
      .addCase(getQuote.rejected, (state, action) => {
        console.error("Failed to get quote:", action.error);
        // Reset loading states on error
        state.isPulseXLoading = false;
        state.isPiteamsLoading = false;
      });

    builder
      .addCase(approveTokenAction.pending, (state) => {
        state.isApproving = true;
      })
      .addCase(approveTokenAction.fulfilled, (state, action) => {
        state.isApproving = false;
        state.isApproved =
          Boolean(action.payload?.transactionHash) &&
          Boolean(action.payload?.hasAllowance);
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
      .addCase(getTokenPrice.pending, (state) => { })
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
        console.error("Failed to get token price:", action.payload ?? action.error);
        if (action.meta.arg.type === "from" && state.fromToken) {
          state.fromToken = { ...state.fromToken, price: undefined };
        }
        if (action.meta.arg.type === "to" && state.toToken) {
          state.toToken = { ...state.toToken, price: undefined };
        }
      });

    builder
      .addCase(checkTokenAllowance.pending, (state, action) => {
        state.isApproving = false;
        state.latestAllowanceRequestId = action.meta.requestId;
      })
      .addCase(checkTokenAllowance.fulfilled, (state, action) => {
        if (state.latestAllowanceRequestId !== action.meta.requestId) {
          return;
        }
        state.isApproved = action.payload?.hasAllowance || false;
      })
      .addCase(checkTokenAllowance.rejected, (state, action) => {
        if (state.latestAllowanceRequestId !== action.meta.requestId) {
          return;
        }
        state.isApproved = false;
      });

    builder
      .addCase(getTokenBalance.fulfilled, (state, action) => { })
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
      .addCase(refreshBalancesAfterSwap.pending, (state) => { })
      .addCase(refreshBalancesAfterSwap.fulfilled, (state, action) => {
        state.fromTokenBalance = action.payload.fromTokenBalance;
        state.toTokenBalance = action.payload.toTokenBalance;
        state.nativeBalance = action.payload.nativeBalance;
      })
      .addCase(refreshBalancesAfterSwap.rejected, (state, action) => {
        console.error("Failed to refresh balances after swap:", action.error);
      });

    builder
      .addCase(getTokenBalancesBatch.pending, (state, action) => {
        state.isTokenBalancesLoading = true;
        state.tokenBalancesRequestId = action.meta.requestId;
        state.tokenBalancesAccount = action.meta.arg.account?.toLowerCase() ?? null;
      })
      .addCase(getTokenBalancesBatch.fulfilled, (state, action) => {
        if (state.tokenBalancesRequestId !== action.meta.requestId) {
          return;
        }

        const requestAccount = action.payload.account ?? null;
        if (
          state.tokenBalancesAccount &&
          requestAccount &&
          state.tokenBalancesAccount !== requestAccount
        ) {
          return;
        }

        state.tokenBalances = action.payload.balances;
        state.tokenBalancesAccount = requestAccount;
        state.isTokenBalancesLoading = false;
      })
      .addCase(getTokenBalancesBatch.rejected, (state, action) => {
        if (state.tokenBalancesRequestId !== action.meta.requestId) {
          return;
        }
        state.isTokenBalancesLoading = false;
      });

    builder
      .addCase(hydrateCustomTokens.fulfilled, (state, action) => {
        state.customTokens = dedupeTokens([
          ...state.customTokens,
          ...action.payload.map((t) => ({ ...t, isCustom: true })),
        ]);
        state.customTokensHydrated = true;
      })
      .addCase(hydrateCustomTokens.rejected, (state) => {
        state.customTokensHydrated = true;
      });

    builder
      .addCase(importCustomToken.pending, (state, action) => {
        state.isImportingCustomToken = true;
        state.importingAddress = normalizeAddressLower(action.meta.arg.address);
      })
      .addCase(importCustomToken.fulfilled, (state, action) => {
        state.isImportingCustomToken = false;
        state.importingAddress = null;
        state.customTokens = dedupeTokens([
          ...state.customTokens,
          { ...action.payload, isCustom: true, origin: action.payload.origin ?? "custom" },
        ]);
        persistCustomTokens(state.customTokens);
      })
      .addCase(importCustomToken.rejected, (state, action) => {
        state.isImportingCustomToken = false;
        state.importingAddress = null;
      });
  },
});

const selectSwapState = (state: RootState) => state.swap;

export const selectAllPulsexTokens = createSelector(
  selectSwapState,
  (swap) => dedupeTokens([...swap.availableTokens, ...swap.customTokens])
);

export const selectDefaultPulsexTokens = createSelector(
  selectAllPulsexTokens,
  selectSwapState,
  (tokens, swap) =>
    dedupeTokens([
      ...tokens.filter(
        (token) => token.tier !== "unverified" && token.origin !== "prefork"
      ),
      ...swap.customTokens.map((t) => ({ ...t, isCustom: true })),
    ])
);

export const selectCoreFavoriteTokens = createSelector(
  selectAllPulsexTokens,
  (tokens) => tokens.filter((token) => token.tier === "core")
);

export const {
  setFromToken,
  setToToken,
  setFromAmount,
  setQuote,
  applyQuoteIfCurrent,
  setSlippage,
  setFromTokenBalance,
  setToTokenBalance,
  setNativeBalance,
  setTokenBalances,
  clearTokenBalances,
  setTransactionHash,
  resetSwapState,
  clearApprovalState,
  setPulseXLoading,
  setPiteamsLoading,
  setHasCalledPulseXOnce,
  setLastPulseXParams,
} = swapSlice.actions;

export default swapSlice.reducer;
