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
  const promoLoading = useAppSelector((state) => state.referral.promoLoading);

  return useMemo(() => {
    const hasReferral =
      !!promo.firstReferrer &&
      promo.firstReferrer.toLowerCase() !== ZeroAddress.toLowerCase();

    const hasDefaultReferrer =
      !!defaultReferrer &&
      defaultReferrer.toLowerCase() !== ZeroAddress.toLowerCase();

    const promoRemaining = promo.promoRemaining ?? 0;
    const promoBps = promo.promoBps;
    const tail = tailBps ?? 10;
    const defaultBps =
      typeof defaultReferrerBps === "number" ? defaultReferrerBps : tail;

    let activeBps = 0;
    let phase: "none" | "promo" | "tail" | "default" = "none";

    if (hasReferral) {
      if (promoRemaining > 0 && promoBps !== null) {
        activeBps = promoBps;
        phase = "promo";
      } else {
        activeBps = tail;
        phase = "tail";
      }
    } else if (hasDefaultReferrer) {
      activeBps = defaultBps;
      phase = "default";
    }

    return {
      firstReferrer: hasReferral ? promo.firstReferrer! : null,
      promoRemaining,
      promoBps,
      tailBps: tail,
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
    promoLoading,
  ]);
};

