import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { ZeroAddress } from "../const/swap";
import useWallet from "./useWallet";

interface ReferralFeeState {
  firstReferrer: string | null;
  promoRemaining: number;
  promoBps: number | null;
  tailBps: number;
  activeBps: number;
  phase: "none" | "promo" | "tail" | "default" | "pending";
  hasReferral: boolean;
  hasDefaultReferrer: boolean;
  hasPendingReferral: boolean;
  promoLoading: boolean;
}

export const useReferralFeeState = (): ReferralFeeState => {
  const promo = useAppSelector((state) => state.referral.promo);
  const tailBps = useAppSelector((state) => state.referral.tailBps);
  const defaultReferrer = useAppSelector(
    (state) => state.referral.defaultReferrer
  );
  const defaultReferrerBps = useAppSelector(
    (state) => state.referral.defaultReferrerBps
  );
  const referrerFeeBasisPoints = useAppSelector(
    (state) => state.referral.referrerFeeBasisPoints
  );
  const maxPromoBps = useAppSelector((state) => state.referral.maxPromoBps);
  const promoLoading = useAppSelector((state) => state.referral.promoLoading);
  const referralAddress = useAppSelector(
    (state) => state.referral.referralAddress?.address
  );
  const { account } = useWallet();

  return useMemo(() => {
    const zeroLower = ZeroAddress.toLowerCase();
    const normalizedAccount = account ? account.toLowerCase() : null;

    const normalizedDefaultReferrer = defaultReferrer
      ? defaultReferrer.toLowerCase()
      : null;
    const normalizedReferralAddress = referralAddress
      ? referralAddress.toLowerCase()
      : null;

    const hasReferral =
      !!promo.firstReferrer && promo.firstReferrer.toLowerCase() !== zeroLower;

    const hasDefaultReferrer =
      !!normalizedDefaultReferrer && normalizedDefaultReferrer !== zeroLower;

    const promoRemaining = promo.promoRemaining ?? 0;
    const tailCap = tailBps ?? 30;

    const parsedReferrerBps =
      referrerFeeBasisPoints !== null && referrerFeeBasisPoints !== undefined
        ? Number(referrerFeeBasisPoints)
        : undefined;

    const isReferralCandidate =
      !!normalizedReferralAddress && normalizedReferralAddress !== zeroLower;

    const isSelfReferralCandidate =
      normalizedReferralAddress && normalizedAccount
        ? normalizedReferralAddress === normalizedAccount
        : false;

    const candidateDiffersFromDefault =
      !isSelfReferralCandidate &&
      isReferralCandidate &&
      (!normalizedDefaultReferrer ||
        normalizedReferralAddress !== normalizedDefaultReferrer);

    const referrerBaseBps = Number.isFinite(parsedReferrerBps)
      ? (parsedReferrerBps as number)
      : promo.promoBps ?? tailCap;

    const defaultBaseBps =
      typeof defaultReferrerBps === "number" ? defaultReferrerBps : tailCap;
    const defaultTail = Math.min(defaultBaseBps, tailCap);
    const promoLimit = typeof maxPromoBps === "number" ? maxPromoBps : 300;

    let activeBps = 0;
    let phase: "none" | "promo" | "tail" | "default" | "pending" = "none";

    const hasPendingReferral =
      !hasReferral &&
      candidateDiffersFromDefault &&
      Number.isFinite(parsedReferrerBps) &&
      (parsedReferrerBps as number) > 0;

    if (hasReferral) {
      if (promoRemaining > 0) {
        activeBps = Math.min(referrerBaseBps, promoLimit);
        phase = "promo";
      } else {
        activeBps = Math.min(referrerBaseBps, tailCap);
        phase = "tail";
      }
    } else if (hasPendingReferral) {
      activeBps = Math.min(referrerBaseBps, promoLimit);
      phase = "pending";
    } else if (hasDefaultReferrer) {
      activeBps = defaultTail;
      phase = "default";
    }

    return {
      firstReferrer: hasReferral ? promo.firstReferrer! : null,
      promoRemaining,
      promoBps: hasReferral ? Math.min(referrerBaseBps, promoLimit) : promo.promoBps,
      tailBps: tailCap,
      activeBps,
      phase,
      hasReferral,
      hasDefaultReferrer,
      hasPendingReferral,
      promoLoading,
    };
  }, [
    promo,
    tailBps,
    defaultReferrer,
    defaultReferrerBps,
    referrerFeeBasisPoints,
    maxPromoBps,
    referralAddress,
    account,
    promoLoading,
  ]);
};





