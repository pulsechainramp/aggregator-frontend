import { useCallback, useState } from "react";
import { hexToHearts } from "../hexClient";
import { HexNetwork, MAX_HEX_STAKE_DAYS, MIN_HEX_STAKE_DAYS } from "../types";
import { useHexContracts } from "./useHexContracts";

type CreateStakeInput = {
  amountHex: string;
  days: number;
};

export const useCreateStake = (network: HexNetwork) => {
  const { getWriteContract } = useHexContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStake = useCallback(
    async ({ amountHex, days }: CreateStakeInput) => {
      const parsedAmount = Number(amountHex);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Enter an amount of HEX to stake.");
      }
      if (days < MIN_HEX_STAKE_DAYS || days > MAX_HEX_STAKE_DAYS) {
        throw new Error(
          `Choose a length between ${MIN_HEX_STAKE_DAYS} and ${MAX_HEX_STAKE_DAYS} days.`
        );
      }

      try {
        setLoading(true);
        setError(null);
        const contract = await getWriteContract(network);
        const hearts = hexToHearts(amountHex);
        const tx = await contract.stakeStart(hearts, BigInt(days));
        if (typeof tx?.wait === "function") {
          await tx.wait();
        }
      } catch (e: any) {
        const message =
          e?.info?.error?.message ??
          e?.error?.message ??
          e?.message ??
          "Failed to create stake";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [getWriteContract, network]
  );

  return { createStake, loading, error };
};
