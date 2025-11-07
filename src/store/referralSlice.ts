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
  getReferralCreationFee,
  hasPaidReferralCreationFee,
  payReferralCreationFee,
} from "../contracts/SwapManager";
import { ethers } from "ethers";
import { lockReferralBinding } from "../utils/referralUtils";
import {
  confirmSiweChallenge,
  getOrCreateSiweClientId,
  rememberSiweNonce,
  signSiweMessage,
  validateSiweMessage,
} from "../utils/siwe";
type ReferralThunkAPI = {
  dispatch: any;
  getState: () => { referral: ReferralState };
};

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

interface ReferralCreationFeeInfo {
  fee: string;
  contractAddress: string;
}

interface SiweChallenge {
  message: string;
  nonce: string;
}

type CreateReferralCodeError =
  | ({ type: "PAYMENT_REQUIRED" } & ReferralCreationFeeInfo)
  | { type: "UNAUTHORIZED"; message: string }
  | { type: "UNKNOWN"; message: string };

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
  authToken: string | null;
  siweChallenge: SiweChallenge | null;
  siweLoading: boolean;
  authenticating: boolean;
  creationFeeInfo: ReferralCreationFeeInfo | null;
  creationFeeLoading: boolean;
  hasPaidCreationFee: boolean | null;
  checkingCreationFee: boolean;
  payingCreationFee: boolean;
  creatingReferralCode: boolean;
  paymentRequired: ReferralCreationFeeInfo | null;
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
  authToken: null,
  siweChallenge: null,
  siweLoading: false,
  authenticating: false,
  creationFeeInfo: null,
  creationFeeLoading: false,
  hasPaidCreationFee: null,
  checkingCreationFee: false,
  payingCreationFee: false,
  creatingReferralCode: false,
  paymentRequired: null,
};

// Async thunk for fetching referral code
export const fetchReferralCode = createAsyncThunk<
  ReferralCode | null,
  string
>("referral/fetchReferralCode", async (address: string) => {
  const params = new URLSearchParams({ address });
  const response = await fetch(`${BackendURL}referral/code?${params.toString()}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch referral code");
  }

  const data = await response.json();
  return data as ReferralCode;
});

// Async thunk for fetching referral address data
export const fetchReferralAddress = createAsyncThunk(
  "referral/fetchReferralAddress",
  async (referralCode: string) => {
    try {
      const params = new URLSearchParams({ referralCode });
      const response = await fetch(
        `${BackendURL}referral/address?${params.toString()}`
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

export const fetchReferralCreationFeeInfo = createAsyncThunk(
  "referral/fetchReferralCreationFeeInfo",
  async () => {
    const response = await fetch(`${BackendURL}referral/creation-fee`);
    if (!response.ok) {
      throw new Error("Failed to fetch referral creation fee");
    }
    const data = await response.json();
    return data as ReferralCreationFeeInfo;
  }
);

export const checkReferralCreationFeePaid = createAsyncThunk<
  boolean,
  string
>("referral/checkReferralCreationFeePaid", async (address: string) => {
  return await hasPaidReferralCreationFee(address);
});

export const submitReferralCreationFeePayment = createAsyncThunk<
  void,
  { account: string },
  { rejectValue: string }
>("referral/submitReferralCreationFeePayment", async ({ account }, thunkAPI) => {
  try {
    const fee = await getReferralCreationFee();
    if (fee === "0") {
      return;
    }
    await payReferralCreationFee({ account, value: fee });
  } catch (error: any) {
    const message =
      error?.message ?? "Failed to pay referral creation fee";
    return thunkAPI.rejectWithValue(message);
  }
});

export const requestSiweChallenge = createAsyncThunk<
  SiweChallenge,
  { address: string; clientId: string }
>("referral/requestSiweChallenge", async ({ address, clientId }) => {
  const params = new URLSearchParams({ address, clientId });
  const response = await fetch(
    `${BackendURL}auth/challenge?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to request SIWE challenge");
  }
  const data = await response.json();
  return data as SiweChallenge;
});

export const verifySiweSignature = createAsyncThunk<
  { token: string; address: string },
  { message: string; signature: string; clientId: string }
>("referral/verifySiweSignature", async ({ message, signature, clientId }) => {
  const response = await fetch(`${BackendURL}auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, signature, clientId }),
  });

  if (!response.ok) {
    throw new Error("Failed to verify SIWE signature");
  }

  const data = await response.json();
  return data as { token: string; address: string };
});

const ensureSiweSessionInternal = async (
  address: string,
  thunkAPI: ReferralThunkAPI
): Promise<string> => {
  if (!address) {
    throw new Error("Connect your wallet to continue");
  }

  const state = thunkAPI.getState?.();
  const existingToken: string | null = state?.referral?.authToken ?? null;

  if (existingToken) {
    return existingToken;
  }

  const clientId = getOrCreateSiweClientId();
  const challenge = await thunkAPI
    .dispatch(requestSiweChallenge({ address, clientId }))
    .unwrap();

  const { fields, preview } = validateSiweMessage(
    challenge.message,
    address.toLowerCase()
  );
  await confirmSiweChallenge(preview);

  const signature = await signSiweMessage(challenge.message);
  const verification = await thunkAPI
    .dispatch(
      verifySiweSignature({
        message: challenge.message,
        signature,
        clientId,
      })
    )
    .unwrap();

  rememberSiweNonce(fields.nonce);
  return verification.token;
};

export const ensureSiweSessionAction = createAsyncThunk<
  string,
  string,
  { state: { referral: ReferralState } }
>("referral/ensureSiweSessionAction", async (address, thunkAPI) =>
  ensureSiweSessionInternal(address, thunkAPI)
);

export const createReferralCodeSecure = createAsyncThunk<
  ReferralCode,
  { address: string; token: string },
  { rejectValue: CreateReferralCodeError }
>("referral/createReferralCodeSecure", async ({ address, token }, thunkAPI) => {
  const idempotencyKey =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const response = await fetch(`${BackendURL}referral/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ address }),
  });

  if (response.status === 402) {
    const data = await response.json();
    return thunkAPI.rejectWithValue({
      type: "PAYMENT_REQUIRED",
      fee: data.fee,
      contractAddress: data.contractAddress,
    });
  }

  if (response.status === 401) {
    return thunkAPI.rejectWithValue({
      type: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  if (!response.ok) {
    return thunkAPI.rejectWithValue({
      type: "UNKNOWN",
      message: "Failed to create referral code",
    });
  }

  const data = await response.json();
  return data as ReferralCode;
});

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
  async (referrerAddress: string, thunkAPI) => {
    if (!referrerAddress) {
      throw new Error("Referrer address is required");
    }

    const token = await thunkAPI
      .dispatch(ensureSiweSessionAction(referrerAddress))
      .unwrap();
    const encodedReferrer = encodeURIComponent(referrerAddress);
    const response = await fetch(
      `${BackendURL}referral-fees/referrer/${encodedReferrer}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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
        state.paymentRequired = null;
      })
      .addCase(fetchReferralCode.fulfilled, (state, action) => {
        state.loading = false;
        state.referralCode = action.payload;
        state.error = null;
        if (action.payload) {
          state.paymentRequired = null;
        }
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
      .addCase(fetchReferralCreationFeeInfo.pending, (state) => {
        state.creationFeeLoading = true;
        state.error = null;
      })
      .addCase(fetchReferralCreationFeeInfo.fulfilled, (state, action) => {
        state.creationFeeLoading = false;
        state.creationFeeInfo = action.payload;
      })
      .addCase(fetchReferralCreationFeeInfo.rejected, (state, action) => {
        state.creationFeeLoading = false;
        state.error =
          action.error.message || "Failed to fetch referral creation fee";
      })
      .addCase(checkReferralCreationFeePaid.pending, (state) => {
        state.checkingCreationFee = true;
      })
      .addCase(checkReferralCreationFeePaid.fulfilled, (state, action) => {
        state.checkingCreationFee = false;
        state.hasPaidCreationFee = action.payload;
        if (action.payload) {
          state.paymentRequired = null;
        }
      })
      .addCase(checkReferralCreationFeePaid.rejected, (state, action) => {
        state.checkingCreationFee = false;
        state.error =
          action.error.message || "Failed to check referral creation fee";
      })
      .addCase(submitReferralCreationFeePayment.pending, (state) => {
        state.payingCreationFee = true;
        state.error = null;
      })
      .addCase(submitReferralCreationFeePayment.fulfilled, (state) => {
        state.payingCreationFee = false;
        state.hasPaidCreationFee = true;
        state.paymentRequired = null;
      })
      .addCase(submitReferralCreationFeePayment.rejected, (state, action) => {
        state.payingCreationFee = false;
        state.error = action.payload || action.error.message || "Failed to pay referral creation fee";
      })
      .addCase(requestSiweChallenge.pending, (state) => {
        state.siweLoading = true;
        state.error = null;
      })
      .addCase(requestSiweChallenge.fulfilled, (state, action) => {
        state.siweLoading = false;
        state.siweChallenge = action.payload;
      })
      .addCase(requestSiweChallenge.rejected, (state, action) => {
        state.siweLoading = false;
        state.siweChallenge = null;
        state.error =
          action.error.message || "Failed to request SIWE challenge";
      })
      .addCase(verifySiweSignature.pending, (state) => {
        state.authenticating = true;
        state.error = null;
      })
      .addCase(verifySiweSignature.fulfilled, (state, action) => {
        state.authenticating = false;
        state.authToken = action.payload.token;
        state.paymentRequired = null;
      })
      .addCase(verifySiweSignature.rejected, (state, action) => {
        state.authenticating = false;
        state.authToken = null;
        state.error =
          action.error.message || "Failed to verify SIWE signature";
      })
      .addCase(createReferralCodeSecure.pending, (state) => {
        state.creatingReferralCode = true;
        state.error = null;
      })
      .addCase(createReferralCodeSecure.fulfilled, (state, action) => {
        state.creatingReferralCode = false;
        state.referralCode = action.payload;
        state.paymentRequired = null;
      })
      .addCase(createReferralCodeSecure.rejected, (state, action) => {
        state.creatingReferralCode = false;
        if (action.payload && action.payload.type === "PAYMENT_REQUIRED") {
          state.paymentRequired = {
            fee: action.payload.fee,
            contractAddress: action.payload.contractAddress,
          };
          state.hasPaidCreationFee = false;
        } else if (action.payload && action.payload.type === "UNAUTHORIZED") {
          state.error = action.payload.message;
          state.authToken = null;
        } else {
          state.error =
            (action.payload && action.payload.type === "UNKNOWN"
              ? action.payload.message
              : null) ||
            action.error.message ||
            "Failed to create referral code";
        }
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
