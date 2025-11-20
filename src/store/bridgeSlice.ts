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
  assertEthereumSourceChain,
  estimateBridgeGasCost,
} from "../contracts/BridgeContract";
import { BackendURL, ZeroAddress } from "../const/swap";
import { ensureSiweSessionAction } from "./referralSlice";
import { ethers } from "ethers";
import { normalizeAmountInput } from "../utils/amount";
import {
  PulsexToken,
  PulsexTokenOrigin,
  PulsexTokenTier,
  EthToken,
} from "../types/PulsexTokens";

const getPublicAssetUrl = (assetPath: string) => {
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedAsset = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
  return `${normalizedBase}${normalizedAsset}`;
};

const createPulseBridgeToken = (token: PulsexToken): BridgeToken => ({
  name: token.name,
  symbol: token.symbol,
  decimals: token.decimals,
  address: token.address,
  chainId: token.chainId,
  logoURI: token.logoURI ?? "",
  tags: token.tags ?? [],
  network: "PulseChain",
  origin: token.origin,
  originAddress: token.originAddress,
  originChainId: token.originChainId,
  tier: token.tier,
});

const createEthBridgeToken = (token: EthToken): BridgeToken => ({
  name: token.name,
  symbol: token.symbol,
  decimals: token.decimals,
  address: token.address,
  chainId: token.chainId,
  logoURI: token.logoURI ?? "",
  tags: token.tags ?? [],
  network: "Ethereum",
  isNative: token.isNative,
});

type ManualPairConfig = {
  pulseSymbol?: string;
  pulseAddress?: string;
  ethSymbol?: string;
  ethAddress?: string;
};

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
      const [pulsechainResponse, ethereumResponse] = await Promise.all([
        fetch(getPublicAssetUrl("pulsex-tokens.json"), { cache: "no-cache" }),
        fetch(getPublicAssetUrl("eth-core-tokens.json"), { cache: "no-cache" }),
      ]);

      if (!pulsechainResponse.ok) {
        throw new Error(
          `Failed to load PulseChain tokens (${pulsechainResponse.status})`
        );
      }
      if (!ethereumResponse.ok) {
        throw new Error(
          `Failed to load Ethereum tokens (${ethereumResponse.status})`
        );
      }

      const pulsexTokens = (await pulsechainResponse.json()) as PulsexToken[];
      const ethTokens = (await ethereumResponse.json()) as EthToken[];

      const pulsechainBridgeTokens = pulsexTokens
        .filter((token) => token.chainId === 369)
        .filter(
          (token) =>
            token.tier !== "unverified" && token.status !== "spam"
        )
        .map(createPulseBridgeToken);

      const ethereumBridgeTokens = ethTokens.map(createEthBridgeToken);
      const tokens = [...ethereumBridgeTokens, ...pulsechainBridgeTokens];

      const ethByAddress = new Map(
        ethereumBridgeTokens.map((token) => [token.address.toLowerCase(), token])
      );
      const ethBySymbol = new Map(
        ethereumBridgeTokens.map((token) => [token.symbol, token])
      );
      const pulseBySymbol = new Map(
        pulsechainBridgeTokens.map((token) => [token.symbol, token])
      );
      const pulseByAddress = new Map(
        pulsechainBridgeTokens.map((token) => [token.address.toLowerCase(), token])
      );

      const pairKeys = new Set<string>();
      const tokenPairs: TokenPair[] = [];
      const pushPair = (from: BridgeToken, to: BridgeToken) => {
        const key = `${from.chainId}:${from.address}->${to.chainId}:${to.address}`;
        if (pairKeys.has(key)) {
          return;
        }
        pairKeys.add(key);
        tokenPairs.push({ from, to });
      };

      pulsechainBridgeTokens.forEach((pulseToken) => {
        if (
          pulseToken.origin === "bridged-eth" &&
          pulseToken.originAddress &&
          ethByAddress.has(pulseToken.originAddress.toLowerCase())
        ) {
          const ethToken = ethByAddress.get(
            pulseToken.originAddress.toLowerCase()
          );
          if (ethToken) {
            pushPair(ethToken, pulseToken);
            pushPair(pulseToken, ethToken);
          }
        }
      });

      const manualPairs: ManualPairConfig[] = [
        // Allow native ETH (zero address) to map onto Pulse WETH (bridged from ETH)
        { ethSymbol: "ETH", pulseSymbol: "WETH" },
      ];

      manualPairs.forEach(
        ({ pulseSymbol, ethSymbol, ethAddress, pulseAddress }) => {
          const pulseToken =
            (pulseSymbol && pulseBySymbol.get(pulseSymbol)) ||
            (pulseAddress && pulseByAddress.get(pulseAddress.toLowerCase()));
          const ethToken =
            (ethSymbol && ethBySymbol.get(ethSymbol)) ||
            (ethAddress && ethByAddress.get(ethAddress.toLowerCase()));

          if (pulseToken && ethToken) {
            pushPair(ethToken, pulseToken);
            pushPair(pulseToken, ethToken);
          }
        }
      );

      return { tokenPairs, tokens };
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
      assertEthereumSourceChain(fromChainId);
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
    amount,
  }: {
    tokenAddress: string;
    networkId: number;
    amount: string;
  }) => {
    try {
      const params = new URLSearchParams({
        tokenAddress,
        networkId: networkId.toString(),
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
    try {
      if (!userAddress) {
        throw new Error("Wallet address is required");
      }

      const token = await thunkAPI
        .dispatch(ensureSiweSessionAction(userAddress))
        .unwrap();
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

      // Swap the chain IDs
      state.fromChainId = oldToChainId;
      state.toChainId = oldFromChainId;

      // If there's a selected token, find its corresponding token and swap
      if (state.selectedToken) {
        const currentTokenSymbol = state.selectedToken.symbol;

        // Find the token pair that contains the current token
        const pair = state.tokenPairs.find(
          (pair) =>
            pair.from.symbol === currentTokenSymbol ||
            pair.to.symbol === currentTokenSymbol
        );

        if (pair) {
          // If we're swapping from Ethereum to PulseChain, get the PulseChain token
          // If we're swapping from PulseChain to Ethereum, get the Ethereum token
          const correspondingToken = oldFromChainId === 1 ? pair.to : pair.from;
          state.selectedToken = correspondingToken;
        } else {
          // If no pair found, clear the selected token
          state.selectedToken = null;
        }
      }

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

