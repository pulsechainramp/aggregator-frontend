import { formatUnits, parseUnits } from "ethers";

export const HEARTS_PER_HEX = 100_000_000n; // 1e8 hearts per HEX
export const SHARE_RATE_SCALE = 100_000n; // 1e5 per HEX contract convention
export const TSHARE = 1_000_000_000_000n; // 1e12 shares per T-share
export const APY_SCALE = 1_000_000_000_000_000_000n; // 1e18 fixed-point scale

export type HexApyEstimate = {
  stakeShares: bigint;
  tSharesScaled: bigint;
  avgPayoutPerTShare: bigint;
  dailyYieldHearts: bigint;
  totalYieldHearts: bigint;
  apyPercentScaled: bigint;
  estimatedEndHearts: bigint;
};

export const parseHexToHearts = (amountHex: string): bigint => {
  const normalized = (amountHex ?? "").trim();
  if (!normalized) return 0n;
  try {
    return parseUnits(normalized, 8);
  } catch {
    return 0n;
  }
};

export const formatHeartsToHex = (hearts: bigint, decimals = 2): string => {
  const raw = formatUnits(hearts, 8);
  if (decimals == null) return raw;
  const [whole, fraction = ""] = raw.split(".");
  if (decimals <= 0) return whole;
  const trimmed = fraction.slice(0, decimals);
  return trimmed.length ? `${whole}.${trimmed}` : whole;
};

export const computeLpbBonusHearts = (principalHearts: bigint, stakeDays: number): bigint => {
  const extraDays = Math.min(3640, Math.max(0, stakeDays - 1));
  return (principalHearts * BigInt(extraDays)) / 1820n;
};

export const computeBpbBonusHearts = (principalHearts: bigint): bigint => {
  const capHearts = 150_000_000n * HEARTS_PER_HEX;
  const denomHearts = 1_500_000_000n * HEARTS_PER_HEX;
  const scaledPrincipal = principalHearts < capHearts ? principalHearts : capHearts;
  return (principalHearts * scaledPrincipal) / denomHearts;
};

export const computeEffectiveHearts = (principalHearts: bigint, stakeDays: number): bigint => {
  const lpbBonus = computeLpbBonusHearts(principalHearts, stakeDays);
  const bpbBonus = computeBpbBonusHearts(principalHearts);
  return principalHearts + lpbBonus + bpbBonus;
};

export const decodeDailyData = (packed: bigint): { payoutTotal: bigint; shareTotal: bigint } => {
  // HEX packs daily data in 72-bit fields: payout | shares | unclaimedSatoshis
  const MASK_72_BITS = (1n << 72n) - 1n;
  const payoutTotal = packed & MASK_72_BITS;
  const shareTotal = (packed >> 72n) & MASK_72_BITS;
  return { payoutTotal, shareTotal };
};

export const computeAvgPayoutPerTShare = (dailyData: bigint[]): bigint | null => {
  if (!dailyData.length) return null;
  let sumPayout = 0n;
  let sumShares = 0n;

  for (const entry of dailyData) {
    const { payoutTotal, shareTotal } = decodeDailyData(entry);
    sumPayout += payoutTotal;
    sumShares += shareTotal;
  }

  if (sumShares === 0n) return null;
  return (sumPayout * TSHARE) / sumShares;
};

export const estimateHexApy = (params: {
  amountHex: string;
  stakeDays: number;
  shareRate: bigint;
  dailyData: bigint[];
}): HexApyEstimate | null => {
  const { amountHex, stakeDays, shareRate, dailyData } = params;
  if (stakeDays <= 0 || shareRate <= 0n) return null;

  const principalHearts = parseHexToHearts(amountHex);
  if (principalHearts <= 0n) return null;

  const avgPayoutPerTShare = computeAvgPayoutPerTShare(dailyData);
  if (!avgPayoutPerTShare) return null;

  const effectiveHearts = computeEffectiveHearts(principalHearts, stakeDays);
  const stakeShares = (effectiveHearts * SHARE_RATE_SCALE) / shareRate;
  const dailyYieldHearts = (stakeShares * avgPayoutPerTShare) / TSHARE;
  const totalYieldHearts = dailyYieldHearts * BigInt(stakeDays);

  const roiScaled = (totalYieldHearts * APY_SCALE) / principalHearts;
  const apyScaled = (roiScaled * 365n) / BigInt(stakeDays);
  const apyPercentScaled = apyScaled * 100n;
  const estimatedEndHearts = principalHearts + totalYieldHearts;

  return {
    stakeShares,
    tSharesScaled: stakeShares / TSHARE,
    avgPayoutPerTShare,
    dailyYieldHearts,
    totalYieldHearts,
    apyPercentScaled,
    estimatedEndHearts,
  };
};
