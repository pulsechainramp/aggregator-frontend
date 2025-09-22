import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { QuoteType, TokenType } from "../types/Swap";
import { ethers } from "ethers";
import { isSelfReferral, getStoredReferralCode } from "../utils/referralUtils";
import { ZeroAddress, SwapManagerAddress, BackendURL } from "../const/swap";
import {
  approveToken,
  executeSwap,
  getTokenAllowance,
  needsApproval,
  createSwapManager,
} from "../contracts/SwapManager";
import { config } from "process";
import { store } from "./store";

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

    const isApproved = await needsApproval(
      tokenAddress,
      userAddress,
      SwapManagerAddress,
      amount,
      decimals
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
            referralAddress = (data?.address || data?.referralAddress || null) as string | null;
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
    type,
  }: {
    address: string;
    blockchainNetwork: string;
    type: "from" | "to";
  }) => {
    const response = await fetch(
      `https://api.rubic.exchange/api/v2/tokens/price/${blockchainNetwork}/${address}`
    );
    const data = await response.json();
    return data?.usd_price || 0;
  }
);

export const getQuote = createAsyncThunk(
  "swap/getQuote",
  async ({
    tokenInAddress,
    tokenOutAddress,
    amount,
    allowedSlippage,
    fromDecimal,
  }: {
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: number;
    allowedSlippage: number;
    fromDecimal: number;
  }) => {
    const response = await fetch(
      `${BackendURL}quote?tokenInAddress=${tokenInAddress}&tokenOutAddress=${tokenOutAddress}&amount=${ethers.parseUnits(
        amount.toString(),
        fromDecimal
      )}&allowedSlippage=${allowedSlippage}&fromDecimal=${fromDecimal}`
    );
    const data = await response.json();
    return data;
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
      state.fromToken = action.payload;
      resetSwapState();
    },
    setToToken: (state, action) => {
      state.toToken = action.payload;
      resetSwapState();
    },
    setFromAmount: (state, action) => {
      state.fromAmount = action.payload;
      resetSwapState();
    },
    setQuote: (state, action) => {
      state.quote = action.payload;
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
        if (!action.payload.error) {
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

          if (isFromTokenValid && isToTokenValid && otherValidation) {
            state.quote = action.payload;
          }
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
