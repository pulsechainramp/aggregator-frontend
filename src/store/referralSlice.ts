import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BackendURL } from "../const/swap";
import { withdrawReferralEarnings, getFeeBasisPoints, updateFeeBasisPoints } from "../contracts/SwapManager";

interface ReferralCode {
  id: string;
  address: string;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

interface ReferralAddress {
  address: string;
  referralCode: string;
  createdAt: string;
}

export interface ReferralFee {
  id: string;
  referrer: string;
  token: string;
  amount: string;
  lastUpdated: string;
  createdAt: string;
}

interface ReferralState {
  referralCode: ReferralCode | null;
  referralAddress: ReferralAddress | null;
  referralFees: ReferralFee[];
  referralFeeBasisPoints: string | null;
  referrerFeeBasisPoints: string | null;
  loading: boolean;
  feeBasisPointsLoading: boolean;
  updatingFeeBasisPoints: boolean;
  error: string | null;
  claiming: boolean;
}

const initialState: ReferralState = {
  referralCode: null,
  referralAddress: null,
  referralFees: [],
  referralFeeBasisPoints: null,
  referrerFeeBasisPoints: null,
  loading: false,
  feeBasisPointsLoading: false,
  updatingFeeBasisPoints: false,
  error: null,
  claiming: false,
};

// Async thunk for fetching referral code
export const fetchReferralCode = createAsyncThunk(
  "referral/fetchReferralCode",
  async (address: string) => {
    const response = await fetch(
      `${BackendURL}referral/code?address=${address}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch referral code");
    }
    const data = await response.json();
    return data as ReferralCode;
  }
);

// Async thunk for fetching referral address data
export const fetchReferralAddress = createAsyncThunk(
  "referral/fetchReferralAddress",
  async (referralCode: string) => {
    const response = await fetch(
      `${BackendURL}referral/address?referralCode=${referralCode}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch referral address");
    }
    const data = await response.json();
    return data as ReferralAddress;
  }
);

// Async thunk for fetching referral fees
export const fetchReferralFees = createAsyncThunk(
  "referral/fetchReferralFees",
  async (referrerAddress: string) => {
    const response = await fetch(
      `${BackendURL}referral-fees/referrer/${referrerAddress}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch referral fees");
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }
);

// Async thunk for claiming referral earnings
export const claimReferralEarnings = createAsyncThunk(
  "referral/claimReferralEarnings",
  async ({ tokens, account }: { tokens: string[]; account: string }) => {
    const transaction = await withdrawReferralEarnings({ tokens, account });
    return transaction;
  }
);

// Async thunk for fetching referral fee basis points
export const fetchReferralFeeBasisPoints = createAsyncThunk(
  "referral/fetchReferralFeeBasisPoints",
  async (referrerAddress: string) => {
    const feeBasisPoints = await getFeeBasisPoints(referrerAddress);
    return feeBasisPoints;
  }
);

// Async thunk for fetching referrer's fee basis points
export const fetchReferrerFeeBasisPoints = createAsyncThunk(
  "referral/fetchReferrerFeeBasisPoints",
  async (referrerAddress: string) => {
    const feeBasisPoints = await getFeeBasisPoints(referrerAddress);
    return feeBasisPoints;
  }
);

// Async thunk for updating referral fee basis points
export const updateReferralFeeBasisPoints = createAsyncThunk(
  "referral/updateReferralFeeBasisPoints",
  async ({ newFeeBasisPoints, account }: { newFeeBasisPoints: string; account: string }) => {
    const transaction = await updateFeeBasisPoints({ newFeeBasisPoints, account });
    return { transaction, newFeeBasisPoints };
  }
);

const referralSlice = createSlice({
  name: "referral",
  initialState,
  reducers: {
    clearReferralCode: (state) => {
      state.referralCode = null;
      state.error = null;
    },
    clearReferralAddress: (state) => {
      state.referralAddress = null;
    },
    setReferralAddress: (state, action: PayloadAction<ReferralAddress>) => {
      state.referralAddress = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReferralCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferralCode.fulfilled, (state, action) => {
        state.loading = false;
        state.referralCode = action.payload;
        state.error = null;
      })
      .addCase(fetchReferralCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch referral code";
      })
      .addCase(fetchReferralAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferralAddress.fulfilled, (state, action) => {
        state.loading = false;
        state.referralAddress = action.payload;
        state.error = null;
      })
      .addCase(fetchReferralAddress.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch referral address";
      })
      .addCase(fetchReferralFees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferralFees.fulfilled, (state, action) => {
        state.loading = false;
        state.referralFees = action.payload;
        state.error = null;
      })
      .addCase(fetchReferralFees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch referral fees";
      })
      .addCase(claimReferralEarnings.pending, (state) => {
        state.claiming = true;
        state.error = null;
      })
      .addCase(claimReferralEarnings.fulfilled, (state, action) => {
        state.claiming = false;
        state.error = null;
      })
      .addCase(claimReferralEarnings.rejected, (state, action) => {
        state.claiming = false;
        state.error =
          action.error.message || "Failed to claim referral earnings";
      })
      .addCase(fetchReferralFeeBasisPoints.pending, (state) => {
        state.feeBasisPointsLoading = true;
        state.error = null;
      })
      .addCase(fetchReferralFeeBasisPoints.fulfilled, (state, action) => {
        state.feeBasisPointsLoading = false;
        state.referralFeeBasisPoints = action.payload;
        state.error = null;
      })
      .addCase(fetchReferralFeeBasisPoints.rejected, (state, action) => {
        state.feeBasisPointsLoading = false;
        state.error = action.error.message || "Failed to fetch referral fee basis points";
      })
      .addCase(updateReferralFeeBasisPoints.pending, (state) => {
        state.updatingFeeBasisPoints = true;
        state.error = null;
      })
      .addCase(updateReferralFeeBasisPoints.fulfilled, (state, action) => {
        state.updatingFeeBasisPoints = false;
        state.referralFeeBasisPoints = action.payload.newFeeBasisPoints;
        state.error = null;
      })
      .addCase(updateReferralFeeBasisPoints.rejected, (state, action) => {
        state.updatingFeeBasisPoints = false;
        state.error = action.error.message || "Failed to update referral fee basis points";
      })
      .addCase(fetchReferrerFeeBasisPoints.pending, (state) => {
        state.feeBasisPointsLoading = true;
        state.error = null;
      })
      .addCase(fetchReferrerFeeBasisPoints.fulfilled, (state, action) => {
        state.feeBasisPointsLoading = false;
        state.referrerFeeBasisPoints = action.payload;
        state.error = null;
      })
      .addCase(fetchReferrerFeeBasisPoints.rejected, (state, action) => {
        state.feeBasisPointsLoading = false;
        state.error = action.error.message || "Failed to fetch referrer fee basis points";
      });
  },
});

export const {
  clearReferralCode,
  clearReferralAddress,
  setReferralAddress,
  setError,
} = referralSlice.actions;
export default referralSlice.reducer;
