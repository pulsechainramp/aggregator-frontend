import { useMemo, useState } from "react";
import { APY_SCALE, estimateHexApy } from "../apy/estimateHexApy";
import { HEX_NETWORKS, HexNetwork, HexStake } from "../types";
import { usePulsechainHexApyInputs } from "../hooks/usePulsechainHexApyInputs";

type Props = {
  network: HexNetwork;
  activeStakes: HexStake[];
  endedStakes: HexStake[];
  currentDay?: number;
  loading?: boolean;
  error?: string | null;
  isWalletConnected: boolean;
  isCorrectNetwork: boolean;
  onEndStake: (stake: HexStake) => void;
  onShowDetails: (stake: HexStake) => void;
  onRefresh?: () => void;
};

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full rounded-full bg-bg-raised">
    <div
      className="h-2 rounded-full bg-primary transition-all"
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

const HexStakeList = ({
  network,
  activeStakes,
  endedStakes,
  currentDay,
  loading,
  error,
  isWalletConnected,
  isCorrectNetwork,
  onEndStake,
  onShowDetails,
  onRefresh,
}: Props) => {
  const [tab, setTab] = useState<"active" | "history">("active");
  const networkLabel = HEX_NETWORKS[network].label;
  const displayCurrentDay = currentDay != null ? currentDay + 1 : undefined;
  const {
    shareRate,
    dailyData,
    isLoading: apyLoading,
  } = usePulsechainHexApyInputs(network);

  const formatApy = (value: bigint | null | undefined, decimals = 1) => {
    if (value == null) return "--";
    const integer = value / APY_SCALE;
    const remainder = value % APY_SCALE;
    if (decimals <= 0) {
      return `${integer}%`;
    }
    const scale = 10n ** BigInt(decimals);
    const fraction = (remainder * scale) / APY_SCALE;
    const fractionStr = fraction.toString().padStart(decimals, "0");
    return `${integer}.${fractionStr}%`;
  };

  const getStakeApy = (stake: HexStake): string => {
    if (apyLoading) return "Loading...";
    if (!shareRate || !dailyData?.length) return "--";
    const estimate = estimateHexApy({
      amountHex: stake.stakedHex,
      stakeDays: stake.stakedDays,
      shareRate,
      dailyData,
    });
    return estimate ? formatApy(estimate.apyPercentScaled, 1) : "--";
  };

  const renderStakeRow = (stake: HexStake, isHistory = false) => {
    const displayEndDay = stake.endDay + 1;
    const servedDays =
      displayCurrentDay != null
        ? Math.max(displayCurrentDay - stake.lockedDay - 1, 0)
        : stake.daysElapsed;
    const progressPct =
      stake.stakedDays > 0 ? Math.min(servedDays / stake.stakedDays, 1) * 100 : stake.progressPct;

    return (
      <div
        key={`${stake.stakeId.toString()}-${stake.stakeIndex}`}
        className="rounded-xl border border-border bg-bg-raised p-4 shadow-inner"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">Stake #{stake.stakeId.toString()}</p>
            <p className="text-xs text-text-muted">
              Locked {stake.stakedHex} HEX • {servedDays}/{stake.stakedDays} days served • Ends on HEX day {displayEndDay}
            </p>
          </div>
          {!isHistory && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>Progress</span>
              <span className="font-semibold text-text">{progressPct.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {!isHistory && (
          <div className="mt-2 space-y-1">
            <ProgressBar value={progressPct} />
            <p className="text-xs text-text-muted">
              Est. APY: {getStakeApy(stake)}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isHistory && (
            <button
              type="button"
              onClick={() => onEndStake(stake)}
              disabled={!isWalletConnected || !isCorrectNetwork}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              End stake
            </button>
          )}
          <button
            type="button"
            onClick={() => onShowDetails(stake)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"
          >
            Details
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyState = (label: string) => (
    <div className="rounded-xl border border-border bg-bg-raised p-4 text-sm text-text-muted">
      You don’t have any {label} stakes on {networkLabel} yet.
    </div>
  );

  return (
    <div className="flex h-full flex-col space-y-4 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your stakes</p>
          <h2 className="text-xl font-semibold text-text">On {networkLabel}</h2>
          {displayCurrentDay != null && (
            <p className="text-xs text-text-muted">Current HEX day: {displayCurrentDay}</p>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text transition hover:border-primary hover:text-primary"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "active"
              ? "bg-primary text-white"
              : "border border-border text-text hover:border-primary hover:text-primary"
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "history"
              ? "bg-primary text-white"
              : "border border-border text-text hover:border-primary hover:text-primary"
          }`}
        >
          History
        </button>
      </div>

      {loading && (
        <div className="rounded-lg border border-border bg-bg-raised p-3 text-sm text-text">
          Loading stakes for {networkLabel}…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && tab === "active" && (
        <div className="space-y-3">
          {activeStakes.length === 0
            ? renderEmptyState("active")
            : activeStakes.map((stake) => renderStakeRow(stake))}
        </div>
      )}

      {!loading && tab === "history" && (
        <div className="space-y-3">
          {endedStakes.length === 0
            ? renderEmptyState("completed")
            : endedStakes.map((stake) => renderStakeRow(stake, true))}
        </div>
      )}
    </div>
  );
};

export default HexStakeList;
