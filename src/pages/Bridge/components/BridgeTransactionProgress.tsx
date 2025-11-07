import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BridgeTransaction } from "../../../store/bridgeSlice";

interface BridgeTransactionProgressProps {
  bridgeTransaction: BridgeTransaction | null;
  isPolling: boolean;
}

const BridgeTransactionProgress: React.FC<BridgeTransactionProgressProps> = ({
  bridgeTransaction,
  isPolling,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for real-time block progress
  useEffect(() => {
    if (bridgeTransaction && bridgeTransaction.status === "pending") {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [bridgeTransaction]);

  if (!bridgeTransaction) return null;

  // Helper function to format amount by removing trailing zeros
  const formatAmount = (amount: string, decimals: number) => {
    const num = parseInt(amount) / Math.pow(10, decimals);
    // Convert to string with fixed precision first
    const formatted = num.toFixed(6);

    // Remove trailing zeros
    let result = formatted;
    while (result.includes(".") && result.endsWith("0")) {
      result = result.slice(0, -1);
    }
    // Remove trailing decimal point if it exists
    if (result.endsWith(".")) {
      result = result.slice(0, -1);
    }

    return result;
  };

  // Calculate progress based on status and timestamps
  const getProgressStep = () => {
    if (bridgeTransaction.status === "executed") return 4;
    if (bridgeTransaction.status === "pending") {
      // Calculate progress based on time elapsed for steps 1-4 (Waiting, Confirming, Exchanging, Sending)
      const createdAt = new Date(bridgeTransaction.createdAt).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;
      const totalExpectedTime = 15 * 60 * 1000; // 15 minutes in milliseconds
      const progress = Math.min(elapsed / totalExpectedTime, 1);

      // Map progress to steps (0-1 to 1-4)
      // Each step represents ~25% of the total time (since we're only going up to Sending)
      if (progress < 0.35) return 0; // Waiting (0-35%)
      if (progress < 0.65) return 1; // Confirming (35-65%)
      if (progress < 0.9) return 2; // Exchanging (65-90%)
      return 3; // Sending (90-100%) - Stay here until API returns 'executed'
    }
    return 0;
  };

  // Calculate block progress (96 blocks = 15 minutes)
  const getBlockProgress = () => {
    const createdAt = new Date(bridgeTransaction.createdAt).getTime();
    const elapsed = currentTime - createdAt;

    // 96 blocks = 15 minutes = 900,000 milliseconds
    // Each block = 9.375 seconds (900,000 / 96)
    const totalBlockTime = 96 * 9.375 * 1000; // 96 blocks in milliseconds
    const blocksElapsed = Math.floor(elapsed / (9.375 * 1000));

    return {
      blocksElapsed: Math.min(blocksElapsed, 96),
      totalBlocks: 96,
      progress: Math.min(elapsed / totalBlockTime, 1),
      isBlockProgressComplete: blocksElapsed >= 96,
      timeRemaining: Math.max(0, totalBlockTime - elapsed),
    };
  };

  const currentStep = getProgressStep();
  const blockProgress = getBlockProgress();
  const progressPercent = Math.min(
    Math.max(blockProgress.progress * 100, 0),
    100
  );

  const steps = [
    { name: "Waiting", key: "waiting" },
    { name: "Confirming", key: "confirming" },
    { name: "Exchanging", key: "exchanging" },
    { name: "Sending", key: "sending" },
    { name: "Finished", key: "finished" },
  ];

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === 4 && bridgeTransaction.status === "executed")
      return "completed";
    if (stepIndex === currentStep) return "current";
    return "pending";
  };

  const getStepIcon = (status: "completed" | "current" | "pending") => {
    switch (status) {
      case "completed":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case "current":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-warning/60 bg-warning">
            {isPolling && (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        );
      case "pending":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg-raised">
            <div className="h-2 w-2 rounded-full bg-border" />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">Bridge Order</h3>
            <p className="text-text-subtle text-sm">ID: {bridgeTransaction.id}</p>
          </div>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-sm font-medium ${
            bridgeTransaction.status === "executed"
              ? "border-success bg-success/10 text-success"
              : "border-warning bg-warning/10 text-warning"
          }`}
        >
          {bridgeTransaction.status === "executed" ? "Finished" : "In Progress"}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center">
                  {getStepIcon(status)}
                  <span
                    className={`mt-2 text-xs font-medium ${
                      status === "completed"
                        ? "text-success"
                        : status === "current"
                        ? "text-warning"
                        : "text-text-subtle"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`mx-4 h-0.5 flex-1 ${
                      status === "completed" ? "bg-success" : "bg-border"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Block Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <span className="text-text-muted text-sm font-medium">
              Block Progress
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-text">
              {blockProgress.blocksElapsed} / {blockProgress.totalBlocks} blocks
            </div>
            <div className="text-text-subtle text-xs">
              {blockProgress.isBlockProgressComplete
                ? "Block time completed"
                : "Processing blocks..."}
            </div>
          </div>
        </div>

        {/* Block Progress Bar */}
        <div className="relative h-2 w-full">
          <svg
            className="h-2 w-full"
            viewBox="0 0 100 4"
            role="img"
            aria-label={`Block progress ${blockProgress.blocksElapsed} of ${blockProgress.totalBlocks}`}
            preserveAspectRatio="none"
          >
            <rect
              x="0"
              y="0"
              width="100"
              height="4"
              rx="2"
              className="fill-current text-border"
            />
            <rect
              x="0"
              y="0"
              width={progressPercent}
              height="4"
              rx="2"
              className={`fill-current ${
                blockProgress.isBlockProgressComplete
                  ? "text-success"
                  : "text-primary"
              }`}
            />
            {!blockProgress.isBlockProgressComplete && (
              <circle
                cx={progressPercent}
                cy="2"
                r="1"
                className="fill-current text-primary"
              />
            )}
          </svg>
        </div>

        {/* Block Status Message */}
        <div className="mt-2 text-center">
          {bridgeTransaction.status === "executed" &&
          blockProgress.isBlockProgressComplete ? (
            <div className="text-green-400 text-sm">
              ✅ Bridge completed after {blockProgress.totalBlocks} blocks
            </div>
          ) : bridgeTransaction.status === "executed" &&
            !blockProgress.isBlockProgressComplete ? (
            <div className="text-green-400 text-sm">
              ✅ Bridge completed before block time finished
            </div>
          ) : bridgeTransaction.status === "pending" &&
            blockProgress.isBlockProgressComplete ? (
            <div className="text-yellow-400 text-sm">
              ⏳ Block time completed, waiting for final confirmation
            </div>
          ) : (
            <div className="text-blue-400 text-sm">
              🔄 Processing block {blockProgress.blocksElapsed} of{" "}
              {blockProgress.totalBlocks}
            </div>
          )}
        </div>

        {/* Time Remaining */}
        {bridgeTransaction.status === "pending" &&
          !blockProgress.isBlockProgressComplete && (
            <div className="mt-2 text-center">
              <div className="text-text-subtle text-xs">
                Estimated time remaining:{" "}
                {Math.ceil(blockProgress.timeRemaining / 60000)} minutes
              </div>
            </div>
          )}

        {/* Block Details */}
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <div className="text-text-subtle">Blocks Processed</div>
              <div className="font-medium text-text">
                {blockProgress.blocksElapsed}
              </div>
            </div>
            <div className="text-center">
              <div className="text-text-subtle">Blocks Remaining</div>
              <div className="font-medium text-text">
                {blockProgress.totalBlocks - blockProgress.blocksElapsed}
              </div>
            </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
              <svg
                className="w-2 h-2 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <span className="text-text-subtle text-sm">From</span>
          </div>
          <div className="font-medium text-text">
            Amount:{" "}
            {formatAmount(
              bridgeTransaction.amount,
              bridgeTransaction.tokenDecimals
            )}{" "}
            {bridgeTransaction.tokenSymbol}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
              <svg
                className="w-2 h-2 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <span className="text-text-subtle text-sm">To</span>
          </div>
          <div className="font-medium text-text">
            Amount:{" "}
            {formatAmount(
              bridgeTransaction.amount,
              bridgeTransaction.tokenDecimals
            )}{" "}
            {bridgeTransaction.tokenSymbol}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-text-subtle text-sm">Timeline</span>
          </div>
          <div className="text-sm text-text">
            <div>
              Created: {new Date(bridgeTransaction.createdAt).toLocaleString()}
            </div>
            {bridgeTransaction.targetTimestamp && (
              <div>
                Completed:{" "}
                {new Date(bridgeTransaction.targetTimestamp).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="text-text-subtle text-sm">Payin Hash</span>
          </div>
          <div className="font-mono text-sm text-text">
            {bridgeTransaction.sourceTxHash.slice(0, 10)}...
            {bridgeTransaction.sourceTxHash.slice(-8)}
          </div>
        </div>
      </div>

      {bridgeTransaction.targetTxHash && (
        <div className="mt-4 rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="text-text-subtle text-sm">Payout Hash</span>
          </div>
          <div className="font-mono text-sm text-text">
            {bridgeTransaction.targetTxHash.slice(0, 10)}...
            {bridgeTransaction.targetTxHash.slice(-8)}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BridgeTransactionProgress;
