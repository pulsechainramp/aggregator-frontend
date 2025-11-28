import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ZeroAddress } from "../const/swap";
import { getTokenBalance } from "../contracts/BridgeBalance";
import {
  readStoredProgress,
  writeStoredProgress,
} from "../utils/startProgress";
import { executeSwapAction } from "./swapSlice";
import { bridgeTokens } from "./bridgeSlice";

type StepState = {
  complete: boolean;
  loading: boolean;
  error: string | null;
  lastChecked: number | null;
};

export type StartProgressState = {
  account: string | null;
  balances: StepState;
  bridge: StepState;
  swap: StepState;
};

const normalizeAccount = (account?: string | null) =>
  account ? account.toLowerCase() : "";

type TokenCheck = { symbol: string; address: string; decimals: number };

const TOKEN_CHECKS: TokenCheck[] = [
  { symbol: "ETH", address: ZeroAddress, decimals: 18 },
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
  {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
  {
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
  },
  {
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
  },
  {
    symbol: "WBTC",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
  },
];

const initialStep: StepState = {
  complete: false,
  loading: false,
  error: null,
  lastChecked: null,
};

const initialState: StartProgressState = {
  account: null,
  balances: { ...initialStep },
  bridge: { ...initialStep },
  swap: { ...initialStep },
};

export const checkStartBalances = createAsyncThunk(
  "startProgress/checkBalances",
  async ({ account }: { account: string }, thunkAPI) => {
    const normalized = normalizeAccount(account);
    if (!normalized) {
      throw new Error("Connect your wallet to check balances");
    }

    let sawError = false;
    const results = await Promise.all(
      TOKEN_CHECKS.map(async (token) => {
        try {
          const raw = await getTokenBalance({
            tokenAddress: token.address,
            account: normalized,
            chainId: 1,
            decimals: token.decimals,
          });
          return BigInt(raw || "0");
        } catch (error: any) {
          console.warn(
            `Failed to load balance for ${token.symbol}:`,
            error?.message ?? error
          );
          sawError = true;
          return 0n;
        }
      })
    );

    const hasTokens = results.some((value) => value > 0n);
    if (!hasTokens && sawError) {
      throw new Error("Failed to check balances");
    }
    return { hasTokens };
  }
);

const startProgressSlice = createSlice({
  name: "startProgress",
  initialState,
  reducers: {
    setAccount(state, action: PayloadAction<string | null>) {
      const normalized = normalizeAccount(action.payload);
      state.account = normalized;
      const stored = readStoredProgress(normalized);
      state.balances = {
        ...initialStep,
        complete: Boolean(stored.hasTokens),
      };
      state.bridge = {
        ...initialStep,
        complete: Boolean(stored.hasBridge),
      };
      state.swap = {
        ...initialStep,
        complete: Boolean(stored.hasSwap),
      };
    },
    markSwapComplete(state) {
      if (!state.account) return;
      state.swap.complete = true;
      state.swap.error = null;
      state.swap.lastChecked = Date.now();
      writeStoredProgress(state.account, { hasSwap: true });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkStartBalances.pending, (state, action) => {
        const account = normalizeAccount(action.meta.arg.account);
        if (state.account !== account) return;
        state.balances.loading = true;
        state.balances.error = null;
      })
      .addCase(checkStartBalances.fulfilled, (state, action) => {
        const account = normalizeAccount(action.meta.arg.account);
        if (state.account !== account) return;
        state.balances.loading = false;
        state.balances.error = null;
        state.balances.complete = action.payload.hasTokens;
        state.balances.lastChecked = Date.now();
        if (action.payload.hasTokens) {
          writeStoredProgress(account, { hasTokens: true });
        }
      })
      .addCase(checkStartBalances.rejected, (state, action) => {
        const account = normalizeAccount(action.meta.arg.account);
        if (state.account !== account) return;
        state.balances.loading = false;
        state.balances.error =
          action.error?.message ?? "Failed to check balances";
        state.balances.lastChecked = Date.now();
      });

    builder
      .addCase(fetchUserTransactions.pending, (state, action) => {
        const account = normalizeAccount(action.meta.arg as string);
        if (state.account !== account) return;
        state.bridge.loading = true;
        state.bridge.error = null;
      })
      .addCase(fetchUserTransactions.fulfilled, (state, action) => {
        const account = normalizeAccount(action.meta.arg as string);
        if (state.account !== account) return;
        const hasExecuted = Array.isArray(action.payload)
          ? action.payload.some((tx) => tx.status === "executed")
          : false;
        state.bridge.loading = false;
        state.bridge.complete = hasExecuted;
        state.bridge.lastChecked = Date.now();
        if (hasExecuted) {
          writeStoredProgress(account, { hasBridge: true });
        }
      })
      .addCase(fetchUserTransactions.rejected, (state, action) => {
        const account = normalizeAccount(action.meta.arg as string);
        if (state.account !== account) return;
        state.bridge.loading = false;
        state.bridge.error =
          action.error?.message ?? "Failed to check bridge history";
        state.bridge.lastChecked = Date.now();
      });

    builder
      .addCase(executeSwapAction.fulfilled, (state, action) => {
        const account = normalizeAccount(action.meta.arg.account);
        if (!account) return;
        writeStoredProgress(account, { hasSwap: true });
        if (state.account === account) {
          state.swap.complete = true;
          state.swap.error = null;
          state.swap.lastChecked = Date.now();
        }
      })
      .addCase(bridgeTokens.fulfilled, (state, action) => {
        const account = normalizeAccount(action.meta.arg.userAddress);
        if (!account) return;
        writeStoredProgress(account, { hasBridge: true });
        if (state.account === account) {
          state.bridge.complete = true;
          state.bridge.error = null;
          state.bridge.lastChecked = Date.now();
        }
      });
  },
});

export const { setAccount, markSwapComplete } = startProgressSlice.actions;

export default startProgressSlice.reducer;
