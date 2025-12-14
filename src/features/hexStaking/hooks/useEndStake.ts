import { useCallback, useState } from "react";
import { HexNetwork } from "../types";
import { useHexContracts } from "./useHexContracts";

type EndStakeInput = {
  stakeIndex: number;
  stakeId: bigint;
};

export const useEndStake = (network: HexNetwork) => {
  const { getWriteContract } = useHexContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endStake = useCallback(
    async ({ stakeIndex, stakeId }: EndStakeInput) => {
      if (stakeIndex < 0) {
        throw new Error("Stake index is required.");
      }
      try {
        setLoading(true);
        setError(null);
        const contract = await getWriteContract(network);
        const tx = await contract.stakeEnd(BigInt(stakeIndex), stakeId);
        if (typeof tx?.wait === "function") {
          await tx.wait();
        }
      } catch (e: any) {
        const message =
          e?.info?.error?.message ??
          e?.error?.message ??
          e?.message ??
          "Failed to end stake";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [getWriteContract, network]
  );

  return { endStake, loading, error };
};
