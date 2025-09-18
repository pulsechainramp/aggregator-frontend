import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Activity selectors
export const useActivityState = () => useSelector((state: RootState) => state.activity);
export const useTransactions = () => useSelector((state: RootState) => state.activity.transactions);
export const useActivityLoading = () => useSelector((state: RootState) => state.activity.loading);
export const useActivityError = () => useSelector((state: RootState) => state.activity.error);

// Referral selectors
export const useReferralState = () => useSelector((state: RootState) => state.referral);
export const useReferralCode = () => useSelector((state: RootState) => state.referral.referralCode);
export const useReferralAddress = () => useSelector((state: RootState) => state.referral.referralAddress);
export const useReferralFees = () => useSelector((state: RootState) => state.referral.referralFees);
export const useReferralFeeBasisPoints = () => useSelector((state: RootState) => state.referral.referralFeeBasisPoints);
export const useReferralFeeBasisPointsLoading = () => useSelector((state: RootState) => state.referral.feeBasisPointsLoading);
export const useReferralUpdatingFeeBasisPoints = () => useSelector((state: RootState) => state.referral.updatingFeeBasisPoints);
export const useReferrerFeeBasisPoints = () => useSelector((state: RootState) => state.referral.referrerFeeBasisPoints);
export const useReferralLoading = () => useSelector((state: RootState) => state.referral.loading);
export const useReferralError = () => useSelector((state: RootState) => state.referral.error);
export const useReferralClaiming = () => useSelector((state: RootState) => state.referral.claiming); 