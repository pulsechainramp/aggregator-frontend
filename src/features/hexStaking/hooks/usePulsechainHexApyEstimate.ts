import { useMemo } from "react";
import { MIN_HEX_STAKE_DAYS, MAX_HEX_STAKE_DAYS } from "../types";
import {
  HexApyEstimate,
  estimateHexApy,
} from "../apy/estimateHexApy";

type Params = {
  stakeAmountHex: string;
  stakeDays: number;
  shareRate: bigint | null;
  dailyData: bigint[] | null;
};

export const usePulsechainHexApyEstimate = ({
  stakeAmountHex,
  stakeDays,
  shareRate,
  dailyData,
}: Params): { estimate: HexApyEstimate | null; error?: string } => {
  return useMemo(() => {
    if (!stakeAmountHex || Number(stakeAmountHex) <= 0) {
      return { estimate: null };
    }
    if (stakeDays < MIN_HEX_STAKE_DAYS || stakeDays > MAX_HEX_STAKE_DAYS) {
      return { estimate: null };
    }
    if (!shareRate || !dailyData?.length) {
      return { estimate: null };
    }

    try {
      const estimate = estimateHexApy({
        amountHex: stakeAmountHex,
        stakeDays,
        shareRate,
        dailyData,
      });
      return { estimate };
    } catch (e: any) {
      return { estimate: null, error: e?.message ?? "Could not calculate APY" };
    }
  }, [dailyData, shareRate, stakeAmountHex, stakeDays]);
};
