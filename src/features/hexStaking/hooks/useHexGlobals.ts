import { useCallback, useEffect, useState } from "react";
import { HexNetwork } from "../types";
import { useHexContracts } from "./useHexContracts";

export const useHexGlobals = (network: HexNetwork) => {
  const { getReadContract } = useHexContracts();
  const [currentDay, setCurrentDay] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const contract = getReadContract(network);
      const day = await contract.currentDay();
      setCurrentDay(Number(day));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load HEX globals");
    } finally {
      setLoading(false);
    }
  }, [getReadContract, network]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    currentDay,
    loading,
    error,
    refresh,
  };
};
