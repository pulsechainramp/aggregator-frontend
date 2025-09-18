import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BridgeTransaction } from "./bridgeSlice";
import { BackendURL } from "../const/swap";

interface ActivityState {
  transactions: BridgeTransaction[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: ActivityState = {
  transactions: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

// Mock data for testing purposes
const getMockTransactions = (userAddress: string) => [
  {
    id: "mock-1",
    messageId:
      "0x00050000809822368a3e57b54d6426d420b1294d3262f4f50000000000095a66",
    userAddress: userAddress,
    sourceChainId: 1,
    targetChainId: 369,
    sourceTxHash:
      "0x91618ad9726a0b48bd48ae2cec12832b4488a4f79afe0e3f089dafc29e0bea72",
    targetTxHash:
      "0x7648862b83e5ee4748b7515ed6821ee64961bfce301a1fd30e24781fcd6152c1",
    tokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    tokenSymbol: "WETH",
    tokenDecimals: 18,
    amount: "18100000000000000",
    status: "executed",
    sourceTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    targetTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    encodedData: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    humanReadableAmount: "0.0181",
  },
  {
    id: "mock-2",
    messageId:
      "0x00050000809822368a3e57b54d6426d420b1294d3262f4f50000000000095a67",
    userAddress: userAddress,
    sourceChainId: 369,
    targetChainId: 1,
    sourceTxHash:
      "0x91618ad9726a0b48bd48ae2cec12832b4488a4f79afe0e3f089dafc29e0bea73",
    targetTxHash: null,
    tokenAddress: "0x0000000000000000000000000000000000000000",
    tokenSymbol: "PLS",
    tokenDecimals: 18,
    amount: "1000000000000000000",
    status: "pending",
    sourceTimestamp: new Date().toISOString(),
    targetTimestamp: null,
    encodedData: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    humanReadableAmount: "1.0",
  },
];

// Fetch user transactions
export const fetchUserTransactions = createAsyncThunk(
  "activity/fetchUserTransactions",
  async (userAddress: string) => {
    try {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transactions?userAddress=${userAddress}&limit=50&offset=0`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data.map((tx: any) => ({
          id: tx.id,
          messageId: tx.messageId,
          userAddress: tx.userAddress,
          sourceChainId: tx.sourceChainId,
          targetChainId: tx.targetChainId,
          sourceTxHash: tx.sourceTxHash,
          targetTxHash: tx.targetTxHash,
          tokenAddress: tx.tokenAddress,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimals: tx.tokenDecimals,
          amount: tx.amount,
          status: tx.status,
          sourceTimestamp: tx.sourceTimestamp,
          targetTimestamp: tx.targetTimestamp,
          encodedData: tx.encodedData,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          humanReadableAmount: tx.humanReadableAmount,
        }));
      }

      return [];
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      return getMockTransactions(userAddress);
    }
  }
);

// Fetch single transaction status
export const fetchTransactionStatus = createAsyncThunk(
  "activity/fetchTransactionStatus",
  async (messageId: string) => {
    try {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transaction/${messageId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const tx = data.data;
        return {
          id: tx.id,
          messageId: tx.messageId,
          userAddress: tx.userAddress,
          sourceChainId: tx.sourceChainId,
          targetChainId: tx.targetChainId,
          sourceTxHash: tx.sourceTxHash,
          targetTxHash: tx.targetTxHash,
          tokenAddress: tx.tokenAddress,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimals: tx.tokenDecimals,
          amount: tx.amount,
          status: tx.status,
          sourceTimestamp: tx.sourceTimestamp,
          targetTimestamp: tx.targetTimestamp,
          encodedData: tx.encodedData,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          humanReadableAmount: tx.humanReadableAmount,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching transaction status:", error);
      return null;
    }
  }
);

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    clearTransactions: (state) => {
      state.transactions = [];
      state.error = null;
      state.lastUpdated = null;
    },
    addTransaction: (state, action: PayloadAction<BridgeTransaction>) => {
      const existingIndex = state.transactions.findIndex(
        (tx) => tx.id === action.payload.id
      );

      if (existingIndex >= 0) {
        state.transactions[existingIndex] = action.payload;
      } else {
        state.transactions.unshift(action.payload);
      }
    },
    updateTransactionStatus: (
      state,
      action: PayloadAction<{
        id: string;
        status: string;
        targetTxHash?: string;
        targetTimestamp?: string;
      }>
    ) => {
      const transaction = state.transactions.find(
        (tx) => tx.id === action.payload.id
      );
      if (transaction) {
        transaction.status = action.payload.status as any;
        if (action.payload.targetTxHash) {
          transaction.targetTxHash = action.payload.targetTxHash;
        }
        if (action.payload.targetTimestamp) {
          transaction.targetTimestamp = action.payload.targetTimestamp;
        }
        transaction.updatedAt = new Date().toISOString();
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
        state.lastUpdated = Date.now();
        state.error = null;
      })
      .addCase(fetchUserTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch transactions";
      })
      .addCase(fetchTransactionStatus.fulfilled, (state, action) => {
        if (action.payload) {
          const existingIndex = state.transactions.findIndex(
            (tx) => tx.id === action.payload!.id
          );

          if (existingIndex >= 0) {
            state.transactions[existingIndex] = action.payload;
          } else {
            state.transactions.unshift(action.payload);
          }
          state.lastUpdated = Date.now();
        }
      });
  },
});

export const {
  clearTransactions,
  addTransaction,
  updateTransactionStatus,
  setError,
} = activitySlice.actions;

export default activitySlice.reducer;
