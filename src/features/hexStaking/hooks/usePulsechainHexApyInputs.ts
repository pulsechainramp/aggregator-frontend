import { useCallback, useEffect, useRef, useState } from "react";
import { HexNetwork } from "../types";
import { useHexContracts } from "./useHexContracts";

const TRAILING_DAYS = 30;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const usePulsechainHexApyInputs = (network: HexNetwork) => {
  const { getReadContract } = useHexContracts();
  const [shareRate, setShareRate] = useState<bigint | null>(null);
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [dailyData, setDailyData] = useState<bigint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    let nextError: Error | undefined;
    let nextShareRate: bigint | null = null;
    let nextCurrentDay: number | null = null;
    let nextDailyData: bigint[] | null = null;

    try {
      setIsLoading(true);
      const contract = getReadContract(network);

      // Share rate: prefer globalInfo/globals, but always fetch currentDay() directly.
      try {
        const info = await contract.globalInfo();
        const shareRateRaw = (info as any)?.shareRate ?? (info as any)?.[2];

        if (shareRateRaw !== undefined) {
          nextShareRate = BigInt(shareRateRaw);
        }
      } catch {
        // Fallback handled below
      }

      if (!nextShareRate || nextShareRate <= 0n) {
        try {
          const globals = await contract.globals();
          const shareRateRaw = (globals as any)?.shareRate ?? (globals as any)?.[2];
          if (shareRateRaw !== undefined) {
            nextShareRate = BigInt(shareRateRaw);
          }
        } catch {
          // continue to currentDay() fallback
        }
      }

      // Always use currentDay() (most up to date)
      const day = await contract.currentDay();
      nextCurrentDay = Number(day);

      if (nextCurrentDay != null && nextCurrentDay > 0) {
        // Use completed days only: [currentDay-TRAILING_DAYS, currentDay) (end exclusive)
        const endDayExclusive = nextCurrentDay;
        const beginDay = Math.max(0, endDayExclusive - TRAILING_DAYS);
        if (endDayExclusive > beginDay) {
          const tryLoad = async (
            firstArg: bigint,
            secondArg: bigint
          ): Promise<bigint[] | null> => {
            const packed = await contract.dailyDataRange(firstArg, secondArg);
            if (Array.isArray(packed) && packed.length > 0) {
              return packed.map((entry: any) => {
                try {
                  return BigInt(entry ?? 0);
                } catch {
                  return 0n;
                }
              });
            }
            return null;
          };

          try {
            // PulseChain dailyDataRange behaves as (beginDay, endDayExclusive). Try that first.
            nextDailyData = await tryLoad(BigInt(beginDay), BigInt(endDayExclusive));
          } catch {
            // Fallback to (beginDay, count) in case other deployments expect count semantics.
            try {
              nextDailyData = await tryLoad(BigInt(beginDay), BigInt(endDayExclusive - beginDay));
            } catch (err: any) {
              nextError =
                err instanceof Error ? err : new Error(err?.message ?? "Failed to load daily data");
            }
          }
        }
      }
    } catch (err: any) {
      nextError = err instanceof Error ? err : new Error(err?.message ?? "Failed to load HEX data");
    } finally {
      if (!mountedRef.current) return;
      setShareRate((prev) => nextShareRate ?? prev);
      setCurrentDay((prev) => nextCurrentDay ?? prev);
      setDailyData((prev) => nextDailyData ?? prev);
      setError(nextError);
      setIsLoading(false);
    }
  }, [getReadContract, network]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    shareRate,
    currentDay,
    dailyData,
    isLoading,
    error,
    refresh,
  };
};
