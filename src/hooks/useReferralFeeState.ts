import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { ZeroAddress } from "../const/swap";

interface ReferralFeeState {
  firstReferrer: string | null;
  promoRemaining: number;
  promoBps: number | null;
  tailBps: number;
  activeBps: number;
  phase: "none" | "promo" | "tail" | "default";
  hasReferral: boolean;
  hasDefaultReferrer: boolean;
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

  return useMemo(() => {
    const hasReferral =
      !!promo.firstReferrer &&
      promo.firstReferrer.toLowerCase() !== ZeroAddress.toLowerCase();

    const hasDefaultReferrer =
      !!defaultReferrer &&
      defaultReferrer.toLowerCase() !== ZeroAddress.toLowerCase();

    const promoRemaining = promo.promoRemaining ?? 0;
    const tailCap = tailBps ?? 30;

    const parsedReferrerBps =
      referrerFeeBasisPoints !== null && referrerFeeBasisPoints !== undefined
        ? Number(referrerFeeBasisPoints)
        : undefined;

    const referrerBaseBps = Number.isFinite(parsedReferrerBps)
      ? (parsedReferrerBps as number)
      : promo.promoBps ?? tailCap;

    const defaultBaseBps =
      typeof defaultReferrerBps === "number" ? defaultReferrerBps : tailCap;
    const defaultTail = Math.min(defaultBaseBps, tailCap);
    const promoLimit = typeof maxPromoBps === "number" ? maxPromoBps : 300;

    let activeBps = 0;
    let phase: "none" | "promo" | "tail" | "default" = "none";

    if (hasReferral) {
      if (promoRemaining > 0) {
        activeBps = Math.min(referrerBaseBps, promoLimit);
        phase = "promo";
      } else {
        activeBps = Math.min(referrerBaseBps, tailCap);
        phase = "tail";
      }
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
      promoLoading,
    };
  }, [
    promo,
    tailBps,
    defaultReferrer,
    defaultReferrerBps,
    referrerFeeBasisPoints,
    maxPromoBps,
    promoLoading,
  ]);
};
