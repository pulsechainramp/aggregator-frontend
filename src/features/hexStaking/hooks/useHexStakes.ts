import { useCallback, useEffect, useMemo, useState } from "react";
import { Interface } from "ethers";
import HexAbi from "../../../abis/Hex.json";
import { heartsToHex, getHexAddress } from "../hexClient";
import { HexNetwork, HexStake, HEX_NETWORKS } from "../types";
import { useHexContracts } from "./useHexContracts";
import { multicall as runMulticall } from "../../../contracts/Multicall";

type Options = {
  currentDayOverride?: number;
};

const LATE_GRACE_DAYS = 14;

export const deriveStakeView = (
  raw: any,
  stakeIndex: number,
  currentDay: number
): HexStake => {
  const stakeId = BigInt(raw?.stakeId ?? raw?.[0] ?? 0n);
  const stakedHearts = BigInt(raw?.stakedHearts ?? raw?.[1] ?? 0n);
  const stakeShares = BigInt(raw?.stakeShares ?? raw?.[2] ?? 0n);
  const lockedDay = Number(raw?.lockedDay ?? raw?.[3] ?? 0);
  const stakedDays = Number(raw?.stakedDays ?? raw?.[4] ?? 0);
  const unlockedDayValue = raw?.unlockedDay ?? raw?.[5];
  const unlockedDay =
    unlockedDayValue === undefined || unlockedDayValue === null
      ? null
      : Number(unlockedDayValue);
  const isAutoStake = Boolean(raw?.isAutoStake ?? raw?.[6] ?? false);

  const endDay = lockedDay + stakedDays;
  const daysElapsed = Math.max(currentDay - lockedDay, 0);
  const daysRemaining = Math.max(endDay - currentDay, 0);
  const isEnded = unlockedDay !== null && unlockedDay > 0;
  const isMatured = currentDay >= endDay;
  const isEarly = !isEnded && currentDay < endDay;
  const isLate = !isEnded && isMatured && currentDay > endDay + LATE_GRACE_DAYS;
  const progressPct =
    stakedDays > 0 ? Math.min(daysElapsed / stakedDays, 1) * 100 : 0;

  return {
    stakeId,
    stakeIndex,
    stakedHearts,
    stakedHex: heartsToHex(stakedHearts),
    stakeShares,
    lockedDay,
    stakedDays,
    unlockedDay,
    isAutoStake,
    endDay,
    daysElapsed,
    daysRemaining,
    progressPct,
    isEnded,
    isMatured,
    isEarly,
    isLate,
  };
};

export const useHexStakes = (
  address: string | undefined,
  network: HexNetwork,
  options?: Options
) => {
  const { getReadContract } = useHexContracts();
  const [activeStakes, setActiveStakes] = useState<HexStake[]>([]);
  const [endedStakes, setEndedStakes] = useState<HexStake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCurrentDay = useMemo(
    () => options?.currentDayOverride,
    [options?.currentDayOverride]
  );

  const refresh = useCallback(async () => {
    if (!address) {
      setActiveStakes([]);
      setEndedStakes([]);
      return;
    }
    try {
      setLoading(true);
      const contract = getReadContract(network);
      const [countRaw, currentDayRaw] = await Promise.all([
        contract.stakeCount(address),
        normalizedCurrentDay != null
          ? Promise.resolve(BigInt(normalizedCurrentDay))
          : contract.currentDay(),
      ]);

      const stakeCount = Number(countRaw);
      const currentDay = Number(currentDayRaw);
      const indices = Array.from({ length: stakeCount }, (_, i) => i);

      let stakeResults: HexStake[] = [];
      try {
        const iface = new Interface((HexAbi as any).abi ?? HexAbi);
        const calls = indices.map((i) => ({
          target: getHexAddress(HEX_NETWORKS[network].chainId),
          callData: iface.encodeFunctionData("stakeLists", [address, i]),
        }));
        const results = await runMulticall(calls, HEX_NETWORKS[network].chainId);
        stakeResults = results
          .map((result, i) => {
            if (!result.success || !result.returnData) return null;
            try {
              const decoded = iface.decodeFunctionResult("stakeLists", result.returnData);
              return deriveStakeView(decoded, i, currentDay);
            } catch {
              return null;
            }
          })
          .filter(Boolean) as HexStake[];
      } catch {
        // Fallback to parallel direct calls if multicall fails
        const direct = await Promise.all(
          indices.map(async (i) => {
            const stake = await contract.stakeLists(address, i);
            return deriveStakeView(stake, i, currentDay);
          })
        );
        stakeResults = direct;
      }

      setActiveStakes(stakeResults.filter((s) => !s.isEnded));
      setEndedStakes(stakeResults.filter((s) => s.isEnded));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load stakes");
    } finally {
      setLoading(false);
    }
  }, [address, getReadContract, network, normalizedCurrentDay]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    activeStakes,
    endedStakes,
    loading,
    error,
    refresh,
  };
};
