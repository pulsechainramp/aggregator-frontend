import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BridgeTransaction } from "./bridgeSlice";
import { BackendURL } from "../const/swap";
import { ensureSiweSessionAction } from "./referralSlice";

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

// Fetch user transactions
export const fetchUserTransactions = createAsyncThunk(
  "activity/fetchUserTransactions",
  async (userAddress: string, thunkAPI) => {
    try {
      if (!userAddress) {
        throw new Error("Connect your wallet to view activity");
      }

      const token = await thunkAPI
        .dispatch(
          ensureSiweSessionAction({
            address: userAddress,
            purpose: "bridge-activity",
          })
        )
        .unwrap();
      const params = new URLSearchParams({
        userAddress,
        limit: "50",
        offset: "0",
      });
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
      throw error;
    }
  }
);

// Fetch single transaction status
export const fetchTransactionStatus = createAsyncThunk(
  "activity/fetchTransactionStatus",
  async (messageId: string) => {
    try {
      const response = await fetch(
        `${BackendURL}exchange/omnibridge/transaction/${encodeURIComponent(messageId)}`
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
