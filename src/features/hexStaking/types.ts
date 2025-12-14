import { PulseChainConfig } from "../../config/chainConfig";

export type HexNetwork = "pulse";

export const HEX_NETWORKS: Record<
  HexNetwork,
  { chainId: number; label: string; shortLabel: string }
> = {
  pulse: {
    chainId: PulseChainConfig.chainId,
    label: "PulseChain",
    shortLabel: "Pulse",
  },
};

export const MIN_HEX_STAKE_DAYS = 1;
export const MAX_HEX_STAKE_DAYS = 5555;

export type HexStake = {
  stakeId: bigint;
  stakeIndex: number;
  stakedHearts: bigint;
  stakedHex: string;
  stakeShares: bigint;
  lockedDay: number;
  stakedDays: number;
  unlockedDay: number | null;
  isAutoStake: boolean;
  endDay: number;
  daysElapsed: number;
  daysRemaining: number;
  progressPct: number;
  isEnded: boolean;
  isMatured: boolean;
  isEarly: boolean;
  isLate: boolean;
};

export const isHexNetwork = (value: string | null | undefined): value is HexNetwork =>
  value === "pulse";
