import { useCallback, useEffect, useRef, useState } from "react";
import { heartsToHex } from "../hexClient";
import useWallet from "../../../hooks/useWallet";
import { HEX_NETWORKS, HexNetwork, HexStake } from "../types";
import { useHexGlobals } from "../hooks/useHexGlobals";
import { useHexStakes } from "../hooks/useHexStakes";
import { useCreateStake } from "../hooks/useCreateStake";
import { useEndStake } from "../hooks/useEndStake";
import { useHexContracts } from "../hooks/useHexContracts";
import HexStakeForm from "./HexStakeForm";
import HexStakeList from "./HexStakeList";
import HexStakeDetailsModal from "./HexStakeDetailsModal";
import HexEndStakeConfirmModal from "./HexEndStakeConfirmModal";

const HexStakePage = () => {
  const { account, currentChainId, switchToChain } = useWallet();
  const selectedNetwork: HexNetwork = "pulse";
  const [hexBalance, setHexBalance] = useState<string>("0");
  const [selectedStake, setSelectedStake] = useState<HexStake | null>(null);
  const [pendingEndStake, setPendingEndStake] = useState<HexStake | null>(null);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [formHeight, setFormHeight] = useState<number | undefined>(undefined);

  const { currentDay, loading: globalsLoading } = useHexGlobals(selectedNetwork);
  const {
    activeStakes,
    endedStakes,
    loading: stakesLoading,
    error: stakesError,
    refresh: refreshStakes,
  } = useHexStakes(account || undefined, selectedNetwork, {
    currentDayOverride: currentDay,
  });
  const { createStake, loading: creatingStake, error: createError } = useCreateStake(selectedNetwork);
  const { endStake, loading: endingStake, error: endError } = useEndStake(selectedNetwork);
  const { getReadContract } = useHexContracts();

  const isWalletConnected = Boolean(account);
  const isCorrectNetwork =
    currentChainId != null && currentChainId === HEX_NETWORKS[selectedNetwork].chainId;

  const loadBalance = useCallback(async () => {
    if (!account) {
      setHexBalance("0");
      return;
    }
    try {
      const contract = getReadContract(selectedNetwork);
      const balance = await contract.balanceOf(account);
      setHexBalance(heartsToHex(balance));
    } catch {
      setHexBalance("0");
    }
  }, [account, getReadContract, selectedNetwork]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance, selectedNetwork]);

  const handleCreateStake = async (args: { amountHex: string; days: number }) => {
    await createStake(args);
    await refreshStakes();
    await loadBalance();
  };

  const handleConfirmEndStake = async () => {
    if (!pendingEndStake) return;
    try {
      await endStake({
        stakeId: pendingEndStake.stakeId,
        stakeIndex: pendingEndStake.stakeIndex,
      });
      setPendingEndStake(null);
      await refreshStakes();
      await loadBalance();
    } catch (e) {
      // keep modal open so the user can retry or cancel
      console.error(e);
    }
  };

  const networkLabel = HEX_NETWORKS[selectedNetwork].label;

  useEffect(() => {
    const node = formRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      if (rect?.height) {
        setFormHeight(rect.height);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">HEX staking</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Stake HEX</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <span>Lock your HEX to earn daily rewards. Longer time = higher estimated APY.</span>
              <button
                type="button"
                onClick={() => setShowLearnMore(true)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Why stake?
              </button>
            </div>
          </div>
          {!isCorrectNetwork && isWalletConnected && (
            <div className="flex flex-col gap-2 rounded-lg border border-warning bg-warning/10 px-3 py-2 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
              <span>
                Please switch your wallet to {networkLabel} to create or end stakes on this network.
              </span>
              <button
                type="button"
                onClick={() => switchToChain(HEX_NETWORKS[selectedNetwork].chainId)}
                className="self-start rounded-lg border border-warning px-3 py-2 text-xs font-semibold text-warning transition hover:bg-warning/15"
              >
                Switch to {networkLabel}
              </button>
            </div>
          )}
          {!isWalletConnected && (
            <div className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-muted">
              Connect your wallet to see balances and stake.
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">
          <div className="h-full" ref={formRef}>
            <HexStakeForm
              network={selectedNetwork}
              hexBalance={hexBalance}
              currentDay={currentDay}
              isWalletConnected={isWalletConnected}
              isCorrectNetwork={isCorrectNetwork}
              onSwitchNetwork={() => switchToChain(HEX_NETWORKS[selectedNetwork].chainId)}
              onCreateStake={handleCreateStake}
              creating={creatingStake}
            />
          </div>

          <div
            className="h-full overflow-y-auto"
            style={formHeight ? { maxHeight: formHeight } : undefined}
          >
            <HexStakeList
              network={selectedNetwork}
              activeStakes={activeStakes}
              endedStakes={endedStakes}
              currentDay={currentDay}
              loading={stakesLoading || globalsLoading || endingStake}
              error={stakesError || createError || endError}
              isWalletConnected={isWalletConnected}
              isCorrectNetwork={isCorrectNetwork}
              onEndStake={(stake) => setPendingEndStake(stake)}
              onShowDetails={(stake) => setSelectedStake(stake)}
              onRefresh={() => {
                refreshStakes();
                loadBalance();
              }}
            />
          </div>
        </div>
      </div>

      <HexStakeDetailsModal
        open={Boolean(selectedStake)}
        stake={selectedStake}
        networkLabel={networkLabel}
        onClose={() => setSelectedStake(null)}
      />

      <HexEndStakeConfirmModal
        open={Boolean(pendingEndStake)}
        stake={pendingEndStake}
        onCancel={() => setPendingEndStake(null)}
        onConfirm={handleConfirmEndStake}
      />

      {showLearnMore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Why stake HEX</p>
                <h3 className="text-lg font-semibold text-text">How staking works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLearnMore(false)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-text-muted">
              <p>
                You lock HEX for a set number of days. While locked, your HEX can’t be moved. When the stake matures, you can end it to withdraw your HEX plus any yield.
              </p>
              <p>
                Ending early destroys part of your HEX as a penalty. Ending late can also reduce your payout. Pick a timeframe you’re comfortable with and set a reminder.
              </p>
              <p>
                Rewards are calculated daily and depend on how much HEX is staked and how long you commit. Longer stakes typically earn a higher estimated APY.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HexStakePage;
