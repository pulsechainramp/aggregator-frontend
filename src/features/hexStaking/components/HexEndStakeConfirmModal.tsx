import { HexStake } from "../types";

type Props = {
  open: boolean;
  stake: HexStake | null;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

const HexEndStakeConfirmModal = ({ open, stake, onConfirm, onCancel }: Props) => {
  if (!open || !stake) return null;

  let headline = "End this stake?";
  if (stake.isEarly) {
    headline = "End early and accept penalties?";
  } else if (stake.isLate) {
    headline = "End stake (late)";
  }

  const message = stake.isEarly
    ? "Ending before the full stake length can permanently burn part of your HEX as an early penalty."
    : stake.isLate
    ? "This stake is past its target end. Some penalties may already apply."
    : "This stake has matured. Ending it will return your HEX plus any earned yield.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-6 shadow-lg">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text">{headline}</h3>
          <p className="text-sm text-text-muted">{message}</p>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-bg-raised p-3 text-sm text-text">
          <div className="flex justify-between">
            <span className="text-text-muted">Stake ID</span>
            <span className="font-mono">{stake.stakeId.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Days locked</span>
            <span className="font-semibold">{stake.stakedDays} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">HEX staked</span>
            <span className="font-semibold">{stake.stakedHex}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            className="w-full rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-danger/90 sm:w-auto"
          >
            End stake
          </button>
        </div>
      </div>
    </div>
  );
};

export default HexEndStakeConfirmModal;
