import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { ZeroAddress } from "../const/swap";

interface ReferralFeeState {
  firstReferrer: string | null;
  promoRemaining: number;
  promoBps: number | null;
  tailBps: number;
  activeBps: number;
  phase: "none" | "promo" | "tail";
  hasReferral: boolean;
  promoLoading: boolean;
}

export const useReferralFeeState = (): ReferralFeeState => {
  const promo = useAppSelector((state) => state.referral.promo);
  const tailBps = useAppSelector((state) => state.referral.tailBps);
  const promoLoading = useAppSelector((state) => state.referral.promoLoading);

  return useMemo(() => {
    const hasReferral =
      !!promo.firstReferrer &&
      promo.firstReferrer.toLowerCase() !== ZeroAddress.toLowerCase();

    const promoRemaining = promo.promoRemaining ?? 0;
    const promoBps = promo.promoBps ?? null;
    const tail = tailBps ?? 10;

    let activeBps = 0;
    let phase: "none" | "promo" | "tail" = "none";

    if (hasReferral) {
      if (promoRemaining > 0 && promoBps !== null) {
        activeBps = promoBps;
        phase = "promo";
      } else {
        activeBps = tail;
        phase = "tail";
      }
    }

    return {
      firstReferrer: hasReferral ? promo.firstReferrer! : null,
      promoRemaining,
      promoBps,
      tailBps: tail,
      activeBps,
      phase,
      hasReferral,
      promoLoading,
    };
  }, [promo, tailBps, promoLoading]);
};
