import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import {
  APY_SCALE,
  SHARE_RATE_SCALE,
  TSHARE,
  computeBpbBonusHearts,
  computeLpbBonusHearts,
  formatHeartsToHex,
  parseHexToHearts,
} from "../apy/estimateHexApy";
import { MAX_HEX_STAKE_DAYS, MIN_HEX_STAKE_DAYS, type HexNetwork, HEX_NETWORKS } from "../types";
import { usePulsechainHexApyEstimate } from "../hooks/usePulsechainHexApyEstimate";
import { usePulsechainHexApyInputs } from "../hooks/usePulsechainHexApyInputs";

type Props = {
  network: HexNetwork;
  hexBalance: string;
  currentDay?: number;
  isWalletConnected: boolean;
  isCorrectNetwork: boolean;
  onSwitchNetwork?: () => Promise<void> | void;
  onCreateStake: (args: { amountHex: string; days: number }) => Promise<void>;
  creating?: boolean;
};

const formatEndDate = (days: number | undefined) => {
  if (!days || days <= 0) return "--";
  try {
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return end.toLocaleDateString();
  } catch {
    return "--";
  }
};

const isValidAmount = (value: string) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
};

const clampedDays = (value: number) =>
  Math.min(Math.max(value, MIN_HEX_STAKE_DAYS), MAX_HEX_STAKE_DAYS);

const formatPercentScaled = (value: bigint, decimals = 1) => {
  if (value <= 0n) return "0%";
  const base = APY_SCALE;
  const integer = value / base;
  const remainder = value % base;
  if (decimals <= 0) {
    return `${integer.toString()}%`;
  }
  const scale = 10n ** BigInt(decimals);
  const fraction = (remainder * scale) / base;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  return `${integer.toString()}.${fractionStr}%`;
};

const HexStakeForm = ({
  network,
  hexBalance,
  currentDay,
  isWalletConnected,
  isCorrectNetwork,
  onSwitchNetwork,
  onCreateStake,
  creating,
}: Props) => {
  const [amountHex, setAmountHex] = useState("");
  const [days, setDays] = useState<number>(365);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const networkLabel = HEX_NETWORKS[network].label;

  const endDay = useMemo(() => {
    if (!currentDay) return undefined;
    return currentDay + days;
  }, [currentDay, days]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await onCreateStake({ amountHex, days });
      setAmountHex("");
    } catch (err: any) {
      setFormError(err?.message ?? "Could not create stake");
    }
  };

  const handleMax = () => setAmountHex(hexBalance || "0");
  const validAmount = isValidAmount(amountHex);
  const isDisabled =
    !isWalletConnected || !isCorrectNetwork || !validAmount || days < MIN_HEX_STAKE_DAYS;

  const {
    shareRate,
    dailyData,
    isLoading: apyLoading,
    error: apyDataError,
    refresh: refreshApyData,
  } = usePulsechainHexApyInputs(network);

  const { estimate, error: estimateError } = usePulsechainHexApyEstimate({
    stakeAmountHex: amountHex,
    stakeDays: days,
    shareRate,
    dailyData,
  });

  const estimatedApy = useMemo(() => {
    if (!validAmount) return "--";
    if (apyLoading) return "Loading...";
    if (estimate) {
      return formatPercentScaled(estimate.apyPercentScaled, 1);
    }
    return "--";
  }, [apyLoading, estimate?.apyPercentScaled, validAmount]);

  const estimatedHexAtEnd = useMemo(() => {
    if (!validAmount) return "--";
    if (apyLoading) return "Loading...";
    if (estimate) {
      return `${formatHeartsToHex(estimate.estimatedEndHearts, 2)} HEX`;
    }
    return "--";
  }, [apyLoading, estimate, validAmount]);

  const estimateErrorMessage = apyDataError?.message ?? estimateError;

  const debugInfo = useMemo(() => {
    if (!validAmount || !shareRate || shareRate <= 0n) return null;
    const principalHearts = parseHexToHearts(amountHex);
    if (principalHearts <= 0n) return null;
    const lpb = computeLpbBonusHearts(principalHearts, days);
    const bpb = computeBpbBonusHearts(principalHearts);
    const effective = principalHearts + lpb + bpb;
    const stakeShares = (effective * SHARE_RATE_SCALE) / shareRate;
    const tSharesFloat = Number(stakeShares) / Number(TSHARE);
    return {
      lpbHex: formatHeartsToHex(lpb, 4),
      bpbHex: formatHeartsToHex(bpb, 6),
      tShares: Number.isFinite(tSharesFloat) ? tSharesFloat.toFixed(9) : "0",
    };
  }, [amountHex, days, shareRate, validAmount]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col space-y-5 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Step-by-step
        </p>
        <h2 className="text-xl font-semibold text-text">Create a stake on {networkLabel}</h2>
        <p className="text-sm text-text-muted">Choose how much HEX and for how long.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-bg-raised p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">1. Amount</p>
        <label className="block text-sm font-semibold text-text">Amount of HEX</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="0.00000001"
            value={amountHex}
            onChange={(e) => setAmountHex(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text shadow-inner focus:border-primary focus:outline-none"
            placeholder="0.0"
          />
          <button
            type="button"
            onClick={handleMax}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"
          >
            MAX
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Available: <span className="font-semibold text-text">{hexBalance || "0"} HEX</span>
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-bg-raised p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">2. Time</p>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-text">Stake length</label>
          <span className="text-xs text-text-muted">
            {MIN_HEX_STAKE_DAYS}–{MAX_HEX_STAKE_DAYS} days
          </span>
        </div>
        <input
          type="range"
          min={MIN_HEX_STAKE_DAYS}
          max={MAX_HEX_STAKE_DAYS}
          value={days}
          onChange={(e) => setDays(clampedDays(Number(e.target.value)))}
          className="w-full accent-primary"
          list="hex-day-ticks"
        />
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>1</span>
          <span>365</span>
          <span>1825</span>
          <span>5555</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{days} days</span>
            <span className="text-xs text-text-muted">
              Approx. end date: {formatEndDate(days)}
            </span>
          </div>
          <input
            type="number"
            min={MIN_HEX_STAKE_DAYS}
            max={MAX_HEX_STAKE_DAYS}
            value={days}
            onChange={(e) => setDays(clampedDays(Number(e.target.value)))}
            className="w-28 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text shadow-inner focus:border-primary focus:outline-none"
            aria-label="Stake length in days"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-050 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">3. Estimate</p>
          <button
            type="button"
            onClick={refreshApyData}
            className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-white/50 p-3 shadow-inner">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span>Estimated APY</span>
              <InformationCircleIcon
                className="h-4 w-4 text-text-muted"
                title="HEX rewards are paid daily to stakers based on shares. Longer stakes get more shares."
              />
            </div>
            <p className="text-xl font-semibold text-text">{estimatedApy}</p>
          </div>
          <div className="rounded-lg border border-border bg-white/50 p-3 shadow-inner">
            <p className="text-xs text-text-muted">Estimated HEX at end</p>
            <p className="text-xl font-semibold text-text">{estimatedHexAtEnd}</p>
          </div>
        </div>
        <p className="text-[11px] text-text-muted">
          Estimate based on recent payouts. Actual rewards can change.
        </p>
        {estimateErrorMessage && (
          <p className="text-[11px] text-danger">
            {estimateErrorMessage}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!debugInfo}
            onClick={() => setShowDebug(true)}
            className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Show APY details
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setShowNotes((prev) => !prev)}
          className="flex w-full items-center justify-between bg-bg-raised px-3 py-2 text-sm font-semibold text-text transition hover:bg-bg-surface"
        >
          <span>Important notes</span>
          <span className="text-xs text-text-muted">{showNotes ? "Hide" : "Show"}</span>
        </button>
        {showNotes && (
          <ul className="space-y-1 bg-bg-surface px-4 py-3 text-xs text-text-muted">
            <li>Your HEX is locked until the end date.</li>
            <li>Ending early can destroy some of your HEX as a penalty.</li>
            <li>You pay a small gas fee when starting and ending a stake.</li>
          </ul>
        )}
      </div>

      {formError && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </div>
      )}

      {!isWalletConnected && (
        <div className="rounded-lg border border-warning bg-warning/10 px-3 py-2 text-sm text-warning">
          Connect your wallet to start staking.
        </div>
      )}

      {isWalletConnected && !isCorrectNetwork && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning bg-warning/10 px-3 py-2 text-sm text-warning">
          <span>Please switch your wallet to {networkLabel} to stake.</span>
          {onSwitchNetwork && (
            <button
              type="button"
              onClick={() => onSwitchNetwork()}
              className="self-start rounded-lg border border-warning px-3 py-2 text-xs font-semibold text-warning transition hover:bg-warning/10"
            >
              Switch network
            </button>
          )}
        </div>
      )}

      <div className="space-y-1">
        <button
          type="submit"
          disabled={isDisabled || creating}
          className="w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Staking HEX..." : `Stake HEX on ${networkLabel}`}
        </button>
        <p className="text-center text-xs text-text-muted">You’ll confirm this in your wallet.</p>
      </div>
      {showDebug && debugInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-bg-surface p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">APY inputs</h3>
              <button
                type="button"
                onClick={() => setShowDebug(false)}
                className="text-xs font-semibold text-text-muted hover:text-text"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm text-text">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Longer Pays Better</span>
                <span className="font-semibold">{debugInfo.lpbHex} HEX</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Bigger Pays Better</span>
                <span className="font-semibold">{debugInfo.bpbHex} HEX</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Estimated T-Shares</span>
                <span className="font-semibold">{debugInfo.tShares}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default HexStakeForm;
