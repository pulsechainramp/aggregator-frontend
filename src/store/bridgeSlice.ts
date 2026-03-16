import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getFormattedTokenBalance,
  BalanceParams,
} from "../contracts/BridgeBalance";
import {
  bridgeTokens as bridgeTokensContract,
  bridgeERC20Tokens,
  BridgeParams,
  handleTokenApproval,
  initializeBridgeManager,
  assertSupportedSourceChain,
  estimateBridgeGasCost,
} from "../contracts/BridgeContract";
import { BackendURL, ZeroAddress } from "../const/swap";
import { clearSiweAuth, ensureSiweSessionAction } from "./referralSlice";
import { ethers } from "ethers";
import { normalizeAmountInput } from "../utils/amount";
import { PulsexTokenOrigin, PulsexTokenTier } from "../types/PulsexTokens";

export interface BridgeToken {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  chainId: number;
  logoURI: string;
  tags: string[];
  network: string;
  origin?: PulsexTokenOrigin;
  originAddress?: string;
  originChainId?: number;
  tier?: PulsexTokenTier;
  isNative?: boolean;
}

export interface BridgeEstimate {
  tokenAddress: string;
  networkId: number;
  amount: number;
  estimatedAmount: number;
  fee: number;
  feePercentage: number;
  isSupported: boolean;
}

export interface BridgeTransaction {
  id: string;
  messageId: string;
  userAddress: string;
  sourceChainId: number;
  targetChainId: number;
  sourceTxHash: string;
  targetTxHash: string | null;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string;
  status: "pending" | "executed" | "failed";
  sourceTimestamp: string;
  targetTimestamp: string | null;
  encodedData: string | null;
  createdAt: string;
  updatedAt: string;
  humanReadableAmount?: string;
  statusDetail?: "bridge_in_progress" | "claim_required" | "completed" | "failed";
  isClaimable?: boolean;
}

export interface TokenPair {
  from: BridgeToken;
  to: BridgeToken;
}

interface BridgeState {
  tokens: BridgeToken[];
  tokenPairs: TokenPair[];
  loading: boolean;
  error: string | null;
  fromChainId: number;
  toChainId: number;
  selectedToken: BridgeToken | null;
  amount: string;
  isBridging: boolean;
  estimate: any;
  estimateLoading: boolean;
  estimateError: string | null;
  balance: string;
  balanceLoading: boolean;
  balanceError: string | null;
  transactionHash: string | null;
  isApproving: boolean;
  approvalTxHash: string | null;
  needsApproval: boolean;
  bridgeTransaction: BridgeTransaction | null;
  bridgeTransactionLoading: boolean;
  bridgeTransactionError: string | null;
  isPolling: boolean;
  pollingError: string | null;
  gasCostWei: string | null;
  gasCostLoading: boolean;
  gasCostError: string | null;
}

const initialState: BridgeState = {
  tokens: [],
  tokenPairs: [],
  loading: false,
  error: null,
  fromChainId: 1,
  toChainId: 369,
  selectedToken: null,
  amount: "",
  isBridging: false,
  transactionHash: null,
  estimate: null,
  estimateLoading: false,
  estimateError: null,
  balance: "",
  balanceLoading: false,
  balanceError: null,
  isApproving: false,
  approvalTxHash: null,
  needsApproval: false,
  bridgeTransaction: null,
  bridgeTransactionLoading: false,
  bridgeTransactionError: null,
  isPolling: false,
  pollingError: null,
  gasCostWei: null,
  gasCostLoading: false,
  gasCostError: null,
};

// Fetch tokens for both chains and create pairs
export const fetchTokenPairs = createAsyncThunk(
  "bridge/fetchTokenPairs",
  async () => {
    try {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/currencies`,
        { cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error(`Failed to load bridge currencies (${response.status})`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.data)) {
        throw new Error(data.error || "Failed to parse bridge currencies");
      }

      const rawTokens = data.data as Array<{
        name: string;
        symbol: string;
        decimals: number;
        address: string;
        chainId: number;
        logoURI?: string;
        tags?: string[];
        network?: string;
      }>;

      // Only support Ethereum + PulseChain for now
      const filteredTokens = rawTokens.filter(
        (token) => token.chainId === 1 || token.chainId === 369
      );

      const tokens: BridgeToken[] = filteredTokens.map((token) => ({
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        address: token.address,
        chainId: token.chainId,
        logoURI: token.logoURI ?? "",
        tags: token.tags ?? [],
        network:
          token.chainId === 1
            ? "Ethereum"
            : token.chainId === 369
            ? "PulseChain"
            : token.network ?? `Chain ${token.chainId}`,
      }));

      const tokensByChain = new Map<number, BridgeToken[]>();
      tokens.forEach((token) => {
        const current = tokensByChain.get(token.chainId) ?? [];
        current.push(token);
        tokensByChain.set(token.chainId, current);
      });

      const cleanSymbol = (symbol: string) =>
        symbol
          .replace(/ from (Ethereum|PulseChain)/i, "")
          .replace(/\s*\(OLD\)/i, "")
          .trim();

      const tagRank = (token: BridgeToken) => {
        if (token.tags?.includes("priority")) return 0;
        if (token.tags?.includes("verified")) return 1;
        return 2;
      };

      const pickPreferred = (candidates: BridgeToken[]) => {
        if (!candidates.length) return null;
        return [...candidates].sort((a, b) => {
          const tagDiff = tagRank(a) - tagRank(b);
          if (tagDiff !== 0) return tagDiff;
          return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
        })[0];
      };

      const pairKeys = new Set<string>();
      const tokenPairs: TokenPair[] = [];
      const pushPair = (from: BridgeToken, to: BridgeToken) => {
        const key = `${from.chainId}:${from.address.toLowerCase()}->${to.chainId}:${to.address.toLowerCase()}`;
        if (pairKeys.has(key)) return;
        pairKeys.add(key);
        tokenPairs.push({ from, to });
      };

      const getCandidates = (chainId: number, baseSymbol: string) => {
        const chainTokens = tokensByChain.get(chainId) ?? [];
        return chainTokens.filter(
          (token) => cleanSymbol(token.symbol).toLowerCase() === baseSymbol.toLowerCase()
        );
      };

      // Pair PulseChain tokens that explicitly come "from Ethereum"
      (tokensByChain.get(369) ?? []).forEach((token) => {
        if (token.symbol.toLowerCase().includes("from ethereum")) {
          const base = cleanSymbol(token.symbol);
          const candidate = pickPreferred(getCandidates(1, base));
          if (candidate) {
            pushPair(candidate, token);
            pushPair(token, candidate);
          }
        }
      });

      // Pair Ethereum tokens that explicitly come "from PulseChain"
      (tokensByChain.get(1) ?? []).forEach((token) => {
        if (token.symbol.toLowerCase().includes("from pulsechain")) {
          const base = cleanSymbol(token.symbol);
          const candidate = pickPreferred(getCandidates(369, base));
          if (candidate) {
            pushPair(token, candidate);
            pushPair(candidate, token);
          }
        }
      });

      // Pair same-symbol tokens across chains (clean symbol match)
      (tokensByChain.get(1) ?? []).forEach((ethToken) => {
        const base = cleanSymbol(ethToken.symbol);
        const candidate = pickPreferred(getCandidates(369, base));
        if (candidate) {
          pushPair(ethToken, candidate);
          pushPair(candidate, ethToken);
        }
      });

      // Native ETH (chain 1) -> WETH-from-Ethereum (chain 369)
      const nativeEth = pickPreferred(
        (tokensByChain.get(1) ?? []).filter(
          (token) => token.address.toLowerCase() === ZeroAddress.toLowerCase()
        )
      );
      const wethOnPulse = pickPreferred(
        getCandidates(369, "WETH").filter((t) =>
          t.symbol.toLowerCase().includes("from ethereum") ||
          cleanSymbol(t.symbol).toLowerCase() === "weth"
        )
      );
      if (nativeEth && wethOnPulse) {
        pushPair(nativeEth, wethOnPulse);
        pushPair(wethOnPulse, nativeEth);
      }

      // Native PLS (chain 369) -> WPLS on Ethereum
      const nativePls = pickPreferred(
        (tokensByChain.get(369) ?? []).filter(
          (token) => token.address.toLowerCase() === ZeroAddress.toLowerCase()
        )
      );
      const wplsOnEth = pickPreferred(getCandidates(1, "WPLS"));
      if (nativePls && wplsOnEth) {
        pushPair(nativePls, wplsOnEth);
        pushPair(wplsOnEth, nativePls);
      }

      // Restrict exposed tokens to those that are part of a valid pair
      const pairedAddresses = new Set<string>();
      tokenPairs.forEach(({ from, to }) => {
        pairedAddresses.add(`${from.chainId}:${from.address.toLowerCase()}`);
        pairedAddresses.add(`${to.chainId}:${to.address.toLowerCase()}`);
      });

      const disallowedSymbols = new Set(["HEX", "PLS", "WPLS", "PLSX"]);

      const pairedTokens = tokens.filter((token) => {
        const key = `${token.chainId}:${token.address.toLowerCase()}`;
        const isPaired = pairedAddresses.has(key);
        // If multiple candidates share a cleaned symbol, keep the highest-ranked one
        if (!isPaired) return false;
        const candidates = (tokensByChain.get(token.chainId) ?? []).filter(
          (t) =>
            cleanSymbol(t.symbol).toLowerCase() ===
            cleanSymbol(token.symbol).toLowerCase()
        );
        const preferred = pickPreferred(candidates);
        if (preferred?.address.toLowerCase() !== token.address.toLowerCase()) {
          return false;
        }
        const cleaned = cleanSymbol(token.symbol).toUpperCase();
        return !disallowedSymbols.has(cleaned);
      });

      return { tokenPairs, tokens: pairedTokens };
    } catch (error) {
      console.error("Error fetching token pairs:", error);
      throw error;
    }
  }
);

export const fetchBridgeGasCost = createAsyncThunk<
  string,
  {
    tokenAddress: string;
    amount: string;
    receiver: string;
    chainId: number;
    userAddress: string;
  }
>("bridge/fetchBridgeGasCost", async (params) => {
  const cost = await estimateBridgeGasCost(params);
  return cost.toString();
});
// Fetch tokens for a specific chain (for backward compatibility)
export const fetchTokens = createAsyncThunk(
  "bridge/fetchTokens",
  async ({
    chainId,
    verified = true,
  }: {
    chainId: number;
    verified?: boolean;
  }) => {
    try {
      const params = new URLSearchParams({
        chainId: chainId.toString(),
        verified: verified ? "true" : "false",
      });
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/currencies?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch tokens");
      }

      return data.data as BridgeToken[];
    } catch (error) {
      console.error("Error fetching tokens:", error);
      throw error;
    }
  }
);

// Bridge tokens action
export const bridgeTokens = createAsyncThunk(
  "bridge/bridgeTokens",
  async (
    {
      fromChainId,
      toChainId,
      token,
      amount,
      userAddress,
    }: {
      fromChainId: number;
      toChainId: number;
      token: BridgeToken;
      amount: string;
      userAddress: string;
    },
    { dispatch }
  ) => {
    try {
      assertSupportedSourceChain(fromChainId);
      const normalizedAmount = normalizeAmountInput(amount);
      // Convert amount to wei
      const amountInWei = ethers.parseUnits(
        normalizedAmount,
        token.decimals
      );

      const bridgeParams: BridgeParams = {
        tokenAddress: token.address,
        amount: amountInWei.toString(),
        receiver: userAddress,
        chainId: fromChainId,
      };

      let transactionHash: string;
      let approvalTxHash: string | undefined;

      // Check if it's a native token (ETH/PLS)
      if (token.address.toLowerCase() === ZeroAddress.toLowerCase()) {
        // Bridge native tokens
        transactionHash = await bridgeTokensContract(bridgeParams);
      } else {
        // Bridge ERC20 tokens - handle approval first
        const { web3, bridgeManagerAddress } = initializeBridgeManager(
          fromChainId,
          token.address
        );

        const approveAmountInWei =
          ((amountInWei * 101n) + 99n) / 100n;

        // Handle approval with state management
        const approvalPerformed = await handleTokenApproval(
          token.address,
          bridgeManagerAddress,
          approveAmountInWei.toString(),
          fromChainId,
          userAddress,
          () => {
            // Approval start callback
            dispatch(bridgeSlice.actions.setApproving(true));
          },
          (txHash: string) => {
            // Approval complete callback
            approvalTxHash = txHash;
            dispatch(bridgeSlice.actions.setApproving(false));
          },
          (error: any) => {
            // Approval error callback
            console.error("Approval failed:", error);
            dispatch(bridgeSlice.actions.setApproving(false));
            throw error; // Re-throw to be caught by the outer try-catch
          }
        );

        // If approval was performed, wait a bit more
        if (approvalPerformed) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Now bridge the tokens
        transactionHash = await bridgeERC20Tokens(bridgeParams);
        // approvalTxHash is already set from the callback
      }

      // Submit the bridge transaction to the API
      try {
        await dispatch(
          submitBridgeTransaction({
            txHash: transactionHash,
            networkId: fromChainId,
            userAddress,
          })
        ).unwrap();
      } catch (submitError) {
        console.error(
          "Failed to submit bridge transaction to API:",
          submitError
        );
        // Don't throw here - the bridge transaction was successful, just the API submission failed
      }

      return { transactionHash, approvalTxHash };
    } catch (error) {
      console.error("Bridge transaction failed:", error);
      throw error;
    }
  }
);

// Fetch bridge estimate
export const fetchBridgeEstimate = createAsyncThunk(
  "bridge/fetchBridgeEstimate",
  async ({
    tokenAddress,
    networkId,
    targetChainId,
    amount,
  }: {
    tokenAddress: string;
    networkId: number;
    targetChainId: number;
    amount: string;
  }) => {
    try {
      const params = new URLSearchParams({
        tokenAddress,
        networkId: networkId.toString(),
        targetChainId: targetChainId.toString(),
        amount,
      });
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/estimate?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch bridge estimate");
      }

      return data.data as BridgeEstimate;
    } catch (error) {
      console.error("Error fetching bridge estimate:", error);
      throw error;
    }
  }
);

// Fetch token balance
export const fetchBalance = createAsyncThunk(
  "bridge/fetchBalance",
  async (params: BalanceParams) => {
    try {
      const balance = await getFormattedTokenBalance(params);
      return balance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }
);

// Submit bridge transaction to API
export const submitBridgeTransaction = createAsyncThunk(
  "bridge/submitBridgeTransaction",
  async ({
    txHash,
    networkId,
    userAddress,
  }: {
    txHash: string;
    networkId: number;
    userAddress: string;
  }, thunkAPI) => {
    const submitWithToken = async (token: string) => {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txHash,
            networkId,
            userAddress,
          }),
        }
      );
      return response;
    };

    const requestToken = async (force?: boolean) =>
      thunkAPI
        .dispatch(
          ensureSiweSessionAction({
            address: userAddress,
            purpose: "bridge-submit",
            force,
          })
        )
        .unwrap();

    if (!userAddress) {
      throw new Error("Wallet address is required");
    }

    try {
      let token = await requestToken(false);
      let response = await submitWithToken(token);

      if (response.status === 401) {
        // Clear cached auth and retry once with fresh SIWE
        thunkAPI.dispatch(clearSiweAuth());
        token = await requestToken(true);
        response = await submitWithToken(token);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to submit bridge transaction");
      }

      return data.data as BridgeTransaction;
    } catch (error) {
      console.error("Error submitting bridge transaction:", error);
      throw error;
    }
  }
);

// Poll bridge transaction status
export const pollBridgeTransactionStatus = createAsyncThunk(
  "bridge/pollBridgeTransactionStatus",
  async (messageId: string) => {
    try {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transaction/${encodeURIComponent(messageId)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Failed to fetch bridge transaction status"
        );
      }
      return data.data as BridgeTransaction;
    } catch (error) {
      console.error("Error polling bridge transaction status:", error);
      throw error;
    }
  }
);

const bridgeSlice = createSlice({
  name: "bridge",
  initialState,
  reducers: {
    setFromChainId: (state, action) => {
      state.fromChainId = action.payload;
      state.selectedToken = null;
      state.amount = "";
    },
    setToChainId: (state, action) => {
      state.toChainId = action.payload;
    },
    setSelectedToken: (state, action) => {
      state.selectedToken = action.payload;
    },
    setAmount: (state, action) => {
      state.amount = action.payload;
    },
    swapChains: (state) => {
      const oldFromChainId = state.fromChainId;
      const oldToChainId = state.toChainId;
      const selectedTokenBeforeSwap = state.selectedToken;
      let swappedSelectedToken: BridgeToken | null = null;

      if (selectedTokenBeforeSwap) {
        const pair = state.tokenPairs.find(
          (pair) =>
            pair.from.chainId === selectedTokenBeforeSwap.chainId &&
            pair.from.address.toLowerCase() ===
              selectedTokenBeforeSwap.address.toLowerCase() &&
            pair.to.chainId === oldToChainId
        );

        swappedSelectedToken = pair ? pair.to : null;
      }

      // Swap the chain IDs
      state.fromChainId = oldToChainId;
      state.toChainId = oldFromChainId;

      // Apply the swapped token after chain IDs are flipped
      state.selectedToken = swappedSelectedToken;

      // Swap the amount based on current estimate
      if (
        state.estimate &&
        state.estimate.estimatedAmount != null &&
        state.selectedToken
      ) {
        const raw = state.estimate.estimatedAmount;
        let estimatedWei: bigint;
        if (typeof raw === "string") {
          estimatedWei = BigInt(raw);
        } else {
          estimatedWei = BigInt(Math.trunc(raw));
        }

        state.amount = ethers.formatUnits(
          estimatedWei,
          state.selectedToken.decimals
        );
      } else {
        // If no estimate available, clear the amount
        state.amount = "";
      }

      // Clear derived state
      state.estimate = null;
      state.estimateError = null;
      state.estimateLoading = false;
      state.gasCostWei = null;
      state.gasCostError = null;
      state.gasCostLoading = false;
      state.needsApproval = false;
      state.transactionHash = null;
      state.approvalTxHash = null;
      state.bridgeTransaction = null;
      state.bridgeTransactionError = null;
      state.isPolling = false;
      state.pollingError = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearEstimate: (state) => {
      state.estimate = null;
      state.estimateError = null;
      state.estimateLoading = false;
    },
    resetBridgeState: (state) => {
      state.amount = "";
      state.selectedToken = null;
      state.isBridging = false;
      state.transactionHash = null;
      state.error = null;
    },
    clearTransactionHash: (state) => {
      state.transactionHash = null;
    },
    clearApprovalHash: (state) => {
      state.approvalTxHash = null;
    },
    setApproving: (state, action) => {
      state.isApproving = action.payload;
    },
    setNeedsApproval: (state, action) => {
      state.needsApproval = action.payload;
    },
    clearBridgeTransaction: (state) => {
      state.bridgeTransaction = null;
      state.bridgeTransactionLoading = false;
      state.bridgeTransactionError = null;
      state.isPolling = false;
      state.pollingError = null;
    },
    clearGasCost: (state) => {
      state.gasCostWei = null;
      state.gasCostLoading = false;
      state.gasCostError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchTokenPairs
      .addCase(fetchTokenPairs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTokenPairs.fulfilled, (state, action) => {
        state.loading = false;
        state.tokenPairs = action.payload.tokenPairs;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(fetchTokenPairs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch token pairs";
      })
      // Handle fetchTokens (for backward compatibility)
      .addCase(fetchTokens.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.loading = false;
        state.tokens = action.payload;
        state.error = null;
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch tokens";
      })
      // Handle bridgeTokens
      .addCase(bridgeTokens.pending, (state) => {
        state.isBridging = true;
        state.error = null;
      })
      .addCase(bridgeTokens.fulfilled, (state, action) => {
        state.isBridging = false;
        state.transactionHash = action.payload.transactionHash;
        state.approvalTxHash = action.payload.approvalTxHash || null;
      })
      .addCase(bridgeTokens.rejected, (state, action) => {
        state.isBridging = false;
        state.isApproving = false;
        state.error = action.error.message || "Bridge transaction failed";
      })
      // Handle fetchBridgeEstimate
      .addCase(fetchBridgeEstimate.pending, (state) => {
        state.estimateLoading = true;
        state.estimateError = null;
        state.estimate = null;
      })
      .addCase(fetchBridgeEstimate.fulfilled, (state, action) => {
        state.estimateLoading = false;
        state.estimate = action.payload;
        state.estimateError = null;
      })
      .addCase(fetchBridgeEstimate.rejected, (state, action) => {
        state.estimateLoading = false;
        state.estimateError =
          action.error.message || "Failed to fetch bridge estimate";
      })
      // Handle fetchBalance
      .addCase(fetchBalance.pending, (state) => {
        state.balanceLoading = true;
        state.balanceError = null;
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        state.balanceLoading = false;
        state.balance = action.payload;
        state.balanceError = null;
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        state.balanceLoading = false;
        state.balanceError = action.error.message || "Failed to fetch balance";
      })
      // Handle submitBridgeTransaction
      .addCase(submitBridgeTransaction.pending, (state) => {
        state.bridgeTransactionLoading = true;
        state.bridgeTransactionError = null;
        state.bridgeTransaction = null;
      })
      .addCase(submitBridgeTransaction.fulfilled, (state, action) => {
        state.bridgeTransactionLoading = false;
        state.bridgeTransaction = action.payload;
        state.bridgeTransactionError = null;
      })
      .addCase(submitBridgeTransaction.rejected, (state, action) => {
        state.bridgeTransactionLoading = false;
        state.bridgeTransactionError =
          action.error.message || "Failed to submit bridge transaction";
      })
      // Handle pollBridgeTransactionStatus
      .addCase(pollBridgeTransactionStatus.pending, (state) => {
        state.isPolling = true;
        state.pollingError = null;
      })
      .addCase(pollBridgeTransactionStatus.fulfilled, (state, action) => {
        state.isPolling = false;
        state.bridgeTransaction = action.payload;
        state.pollingError = null;
      })
      .addCase(pollBridgeTransactionStatus.rejected, (state, action) => {
        state.isPolling = false;
        state.pollingError =
          action.error.message || "Failed to poll bridge transaction status";
      })
      .addCase(fetchBridgeGasCost.pending, (state) => {
        state.gasCostLoading = true;
        state.gasCostError = null;
      })
      .addCase(fetchBridgeGasCost.fulfilled, (state, action) => {
        state.gasCostLoading = false;
        state.gasCostWei = action.payload;
      })
      .addCase(fetchBridgeGasCost.rejected, (state, action) => {
        state.gasCostLoading = false;
        state.gasCostWei = null;
        state.gasCostError =
          action.error.message || "Failed to estimate bridge gas cost";
      });
  },
});

export const {
  setFromChainId,
  setToChainId,
  setSelectedToken,
  setAmount,
  swapChains,
  clearError,
  resetBridgeState,
  clearTransactionHash,
  clearApprovalHash,
  setApproving,
  setNeedsApproval,
  clearBridgeTransaction,
  clearGasCost,
  clearEstimate,
} = bridgeSlice.actions;

export default bridgeSlice.reducer;

