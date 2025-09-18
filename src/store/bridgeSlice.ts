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
} from "../contracts/BridgeContract";
import { BackendURL } from "../const/swap";
import { ethers } from "ethers";

export interface BridgeToken {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  chainId: number;
  logoURI: string;
  tags: string[];
  network: string;
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
};

// Fetch tokens for both chains and create pairs
export const fetchTokenPairs = createAsyncThunk(
  "bridge/fetchTokenPairs",
  async () => {
    try {
      // Fetch tokens for both chains simultaneously
      const [ethResponse, plsResponse] = await Promise.all([
        fetch(
          `${BackendURL}exchange/omnibridge/currencies?chainId=1&verified=true`
        ),
        fetch(
          `${BackendURL}exchange/omnibridge/currencies?chainId=369&verified=true`
        ),
      ]);

      if (!ethResponse.ok) {
        throw new Error(`Ethereum API error! status: ${ethResponse.status}`);
      }

      if (!plsResponse.ok) {
        throw new Error(`PulseChain API error! status: ${plsResponse.status}`);
      }

      const ethData = await ethResponse.json();
      const plsData = await plsResponse.json();

      if (!ethData.success) {
        throw new Error(ethData.message || "Failed to fetch Ethereum tokens");
      }

      if (!plsData.success) {
        throw new Error(plsData.message || "Failed to fetch PulseChain tokens");
      }

      const ethereumTokens = ethData.data as BridgeToken[];
      const pulsechainTokens = plsData.data as BridgeToken[];

      const tokenPairs: TokenPair[] = [];

      const findTokenBySymbol = (
        tokens: BridgeToken[],
        symbol: string
      ): BridgeToken | undefined => {
        return tokens.find((token) => token.symbol === symbol);
      };

      // Ethereum (from) -> PulseChain (to) mappings
      const ethToPlsMappings = [
        { ethSymbol: "ETH", plsSymbol: "WETH from Ethereum" },
        { ethSymbol: "WPLS", plsSymbol: "WPLS" },
        { ethSymbol: "HEX", plsSymbol: "HEX from Ethereum" },
        { ethSymbol: "WETH", plsSymbol: "WETH from Ethereum" },
        { ethSymbol: "DAI", plsSymbol: "DAI from Ethereum" },
        { ethSymbol: "USDC", plsSymbol: "USDC from Ethereum" },
        { ethSymbol: "USDT", plsSymbol: "USDT from Ethereum" },
        { ethSymbol: "WBTC", plsSymbol: "WBTC from Ethereum" },
        { ethSymbol: "PLSX from PulseChain", plsSymbol: "PLSX" },
      ];

      // PulseChain (from) -> Ethereum (to) mappings
      const plsToEthMappings = [
        { plsSymbol: "PLS", ethSymbol: "WPLS" },
        { plsSymbol: "WPLS", ethSymbol: "WPLS" },
        { plsSymbol: "HEX from Ethereum", ethSymbol: "HEX" },
        { plsSymbol: "WETH from Ethereum", ethSymbol: "WETH" },
        { plsSymbol: "DAI from Ethereum", ethSymbol: "DAI" },
        { plsSymbol: "USDC from Ethereum", ethSymbol: "USDC" },
        { plsSymbol: "USDT from Ethereum", ethSymbol: "USDT" },
        { plsSymbol: "WBTC from Ethereum", ethSymbol: "WBTC" },
        { plsSymbol: "PLSX", ethSymbol: "PLSX from PulseChain" },
      ];

      // Create pairs for Ethereum -> PulseChain
      ethToPlsMappings.forEach((mapping) => {
        const ethToken = findTokenBySymbol(ethereumTokens, mapping.ethSymbol);
        const plsToken = findTokenBySymbol(pulsechainTokens, mapping.plsSymbol);

        if (ethToken && plsToken) {
          tokenPairs.push({
            from: ethToken,
            to: plsToken,
          });
        }
      });

      // Create pairs for PulseChain -> Ethereum
      plsToEthMappings.forEach((mapping) => {
        const plsToken = findTokenBySymbol(pulsechainTokens, mapping.plsSymbol);
        const ethToken = findTokenBySymbol(ethereumTokens, mapping.ethSymbol);

        if (plsToken && ethToken) {
          tokenPairs.push({
            from: plsToken,
            to: ethToken,
          });
        }
      });

      // Combine all tokens for the token selector
      const allTokens = [...ethereumTokens, ...pulsechainTokens];

      return {
        tokenPairs,
        tokens: allTokens,
        ethereumTokens,
        pulsechainTokens,
      };
    } catch (error) {
      console.error("Error fetching token pairs:", error);
      throw error;
    }
  }
);

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
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/currencies?chainId=${chainId}&verified=${verified}`
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
      // Convert amount to wei
      const amountInWei = ethers.parseUnits(
        parseFloat(amount).toFixed(token.decimals),
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
      if (
        token.address.toLowerCase() ===
        "0x0000000000000000000000000000000000000000"
      ) {
        // Bridge native tokens
        transactionHash = await bridgeTokensContract(bridgeParams);
      } else {
        // Bridge ERC20 tokens - handle approval first
        const { web3, bridgeManagerAddress } = initializeBridgeManager(
          fromChainId,
          token.address
        );

        const approveAmountInWei = ethers.parseUnits(
          (Number(amount) * 1.01).toFixed(token.decimals),
          token.decimals
        );

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
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/estimate?tokenAddress=${tokenAddress}&networkId=${networkId}&amount=${amount}`
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
  }) => {
    try {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
        `${BackendURL}exchange/omnibridge/transaction/${messageId}`
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
        state.estimate.estimatedAmount &&
        state.selectedToken
      ) {
        // Convert estimated amount from wei to human readable format
        const estimatedAmountHuman = (
          state.estimate.estimatedAmount /
          Math.pow(10, state.selectedToken.decimals)
        ).toFixed(6);
        state.amount = estimatedAmountHuman;
      } else {
        // If no estimate available, clear the amount
        state.amount = "";
      }
    },
    clearError: (state) => {
      state.error = null;
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
} = bridgeSlice.actions;

export default bridgeSlice.reducer;
