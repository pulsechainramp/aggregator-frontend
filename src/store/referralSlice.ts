import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BackendURL } from "../const/swap";
import {
  withdrawReferralEarnings,
  getFeeBasisPoints,
  updateFeeBasisPoints,
  getReferrerEarnings,
  getTokenDecimals,
  getReferralPromo,
  getPromoConstants,
} from "../contracts/SwapManager";
import { ethers } from "ethers";
import { lockReferralBinding } from "../utils/referralUtils";

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

interface ReferralPromoState {
  firstReferrer: string | null;
  boundAt: string | null;
  promoBps: number | null;
  promoRemaining: number | null;
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
  promo: ReferralPromoState;
  promoLoading: boolean;
  maxPromoBps: number | null;
  tailBps: number | null;
  defaultReferrer: string | null;
  defaultReferrerBps: number | null;
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
  promo: {
    firstReferrer: null,
    boundAt: null,
    promoBps: null,
    promoRemaining: null,
  },
  promoLoading: false,
  maxPromoBps: null,
  tailBps: null,
  defaultReferrer: null,
  defaultReferrerBps: null,
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
    try {
      const response = await fetch(
        `${BackendURL}referral/address?referralCode=${referralCode}`
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch referral address");
      }

      const data = await response.json();
      return data as ReferralAddress;
    } catch (error) {
      console.error("Failed to fetch referral address:", error);
      return null;
    }
  }
);

export const fetchReferralPromo = createAsyncThunk(
  "referral/fetchReferralPromo",
  async (userAddress: string) => {
    const promo = await getReferralPromo(userAddress);

    if (promo.firstReferrer) {
      lockReferralBinding();
    }

    return {
      firstReferrer: promo.firstReferrer,
      boundAt: promo.boundAt > 0n ? promo.boundAt.toString() : null,
      promoBps: promo.promoBps ?? null,
      promoRemaining: promo.promoRemaining ?? null,
    };
  }
);

export const fetchPromoConstants = createAsyncThunk(
  "referral/fetchPromoConstants",
  async () => {
    return await getPromoConstants();
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
    const apiData = await response.json();
    const fees = Array.isArray(apiData) ? apiData : [apiData];

    if (fees.length === 0) {
      return [];
    }

    const tokens = fees.map((fee: ReferralFee) => fee.token);

    const earnings = await getReferrerEarnings(referrerAddress, tokens);
    console.log("earnings", earnings);

    const formattedFees = await Promise.all(
      fees.map(async (fee: ReferralFee, index: number) => {
        try {
          const decimals = await getTokenDecimals(fee.token);

          const earningInWei = earnings[index];

          const formattedAmount = ethers.formatUnits(earningInWei, decimals);

          return {
            ...fee,
            amount: formattedAmount,
          };
        } catch (error) {
          console.error(`Failed to process token ${fee.token}:`, error);
          return fee;
        }
      })
    );

    return formattedFees;
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
  async ({
    newFeeBasisPoints,
    account,
  }: {
    newFeeBasisPoints: string;
    account: string;
  }) => {
    const transaction = await updateFeeBasisPoints({
      newFeeBasisPoints,
      account,
    });
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
      state.referralFeeBasisPoints = null;
      state.referrerFeeBasisPoints = null;
    },
    setReferralAddress: (state, action: PayloadAction<ReferralAddress>) => {
      state.referralAddress = action.payload;
      state.referralFeeBasisPoints = null;
      state.referrerFeeBasisPoints = null;
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
        state.referralFeeBasisPoints = null;
        state.referrerFeeBasisPoints = null;
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
        state.error =
          action.error.message || "Failed to fetch referral fee basis points";
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
        state.error =
          action.error.message || "Failed to update referral fee basis points";
      })
      .addCase(fetchReferralPromo.pending, (state) => {
        state.promoLoading = true;
        state.error = null;
      })
      .addCase(fetchReferralPromo.fulfilled, (state, action) => {
        state.promoLoading = false;
        state.promo = {
          firstReferrer: action.payload.firstReferrer,
          boundAt: action.payload.boundAt,
          promoBps: action.payload.promoBps,
          promoRemaining: action.payload.promoRemaining,
        };
      })
      .addCase(fetchReferralPromo.rejected, (state, action) => {
        state.promoLoading = false;
        state.error =
          action.error.message || "Failed to fetch referral status";
      })
      .addCase(fetchPromoConstants.fulfilled, (state, action) => {
        state.maxPromoBps = action.payload.maxPromoBps;
        state.tailBps = action.payload.tailBps;
        state.defaultReferrer = action.payload.defaultReferrer;
        state.defaultReferrerBps = action.payload.defaultReferrerBps;
        state.error = null;
      })
      .addCase(fetchPromoConstants.rejected, (state, action) => {
        state.error =
          action.error.message || "Failed to fetch referral constants";
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
        state.error =
          action.error.message || "Failed to fetch referrer fee basis points";
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
