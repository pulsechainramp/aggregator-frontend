import { HexStake } from "../types";

type Props = {
  open: boolean;
  stake: HexStake | null;
  networkLabel: string;
  onClose: () => void;
};

const HexStakeDetailsModal = ({ open, stake, networkLabel, onClose }: Props) => {
  if (!open || !stake) return null;
  const displayLockedDay = stake.lockedDay + 1;
  const displayEndDay = stake.endDay + 1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              HEX stake details
            </p>
            <h3 className="text-lg font-semibold text-text">Stake on {networkLabel}</h3>
            <p className="text-xs text-text-muted">
              Stake ID {stake.stakeId.toString()} • Index {stake.stakeIndex}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text transition hover:border-primary hover:text-primary"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-bg-raised p-3">
            <p className="text-xs text-text-muted">HEX staked</p>
            <p className="text-lg font-semibold text-text">{stake.stakedHex}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-3">
            <p className="text-xs text-text-muted">Stake shares</p>
            <p className="text-lg font-semibold text-text">
              {stake.stakeShares.toString()}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-3">
            <p className="text-xs text-text-muted">Locked day</p>
            <p className="text-lg font-semibold text-text">{displayLockedDay}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-3">
            <p className="text-xs text-text-muted">End day</p>
            <p className="text-lg font-semibold text-text">{displayEndDay}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-3">
            <p className="text-xs text-text-muted">Progress</p>
            <p className="text-lg font-semibold text-text">
              {stake.progressPct.toFixed(1)}%
            </p>
            <p className="text-xs text-text-muted">
              {stake.daysElapsed} / {stake.stakedDays} days
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-raised p-3">
            <p className="text-xs text-text-muted">Status</p>
            <p className="text-lg font-semibold text-text">
              {stake.isEnded
                ? "Ended"
                : stake.isEarly
                ? "Active (early end would penalize)"
                : stake.isLate
                ? "Active (late)"
                : "Active"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-border bg-bg-raised p-3">
          <p className="text-sm font-semibold text-text">Advanced information</p>
          <p className="text-xs text-text-muted">
            APY, payout breakdown, and Good Accounting actions will appear here in a later phase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HexStakeDetailsModal;
