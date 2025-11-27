import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import { formatUnits } from "ethers";
import { BridgeTransaction } from "../../../store/bridgeSlice";
import { useNumberFormat } from "../../../context/NumberFormatContext";

interface BridgeTransactionProgressProps {
  bridgeTransaction: BridgeTransaction | null;
  isPolling: boolean;
  onBridgeAnother: () => void;
  onSwap?: () => void;
  pollingError?: string | null;
}

const TOTAL_EXPECTED_MS = 20 * 60 * 1000;
const TOTAL_BLOCKS = 128;
const BLOCK_TIME_MS = TOTAL_EXPECTED_MS / TOTAL_BLOCKS;

const chainNames: Record<number, string> = {
  1: "Ethereum",
  369: "PulseChain",
};

const explorerBases: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  369: "https://scan.pulsechain.com/tx/",
};

const getChainName = (chainId: number) =>
  chainNames[chainId] ?? `Chain ${chainId}`;

const getExplorerUrl = (chainId: number, hash?: string | null) => {
  if (!hash) return null;
  const base = explorerBases[chainId];
  return base ? `${base}${hash}` : null;
};

const formatHash = (hash?: string | null) => {
  if (!hash) return "--";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return "--";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

const formatEta = (
  msRemaining: number | null,
  isExecuted: boolean,
  isFailed: boolean
) => {
  if (isFailed) return "requires attention";
  if (isExecuted) return "completed";
  if (msRemaining === null) return "a few minutes";
  if (msRemaining <= 45_000) return "less than a minute";
  const minutes = Math.ceil(msRemaining / 60_000);
  return `about ${minutes} minute${minutes === 1 ? "" : "s"} left`;
};

const formatMinutes = (ms: number) =>
  `${Math.ceil(ms / 60_000)} minute${Math.ceil(ms / 60_000) === 1 ? "" : "s"}`;

const formatDuration = (ms: number) => {
  if (ms <= 0) return "moments";
  if (ms < 60_000) return "less than a minute";
  const minutes = Math.round(ms / 60_000);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const BridgeTransactionProgress: React.FC<
  BridgeTransactionProgressProps
> = ({ bridgeTransaction, isPolling, onBridgeAnother, onSwap, pollingError }) => {
  const { formatNumber } = useNumberFormat();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyMessageId, setCopyMessageId] = useState(false);
  const [copyPayin, setCopyPayin] = useState(false);
  const [copyPayout, setCopyPayout] = useState(false);

  useEffect(() => {
    if (bridgeTransaction && bridgeTransaction.status === "pending") {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [bridgeTransaction]);

  if (!bridgeTransaction) return null;

  const isExecuted = bridgeTransaction.status === "executed";
  const isFailed = bridgeTransaction.status === "failed";

  const blockProgress = useMemo(() => {
    const createdAt = new Date(bridgeTransaction.createdAt).getTime();
    const elapsedMs = Math.max(currentTime - createdAt, 0);
    const blocksElapsed = Math.min(
      Math.floor(elapsedMs / BLOCK_TIME_MS),
      TOTAL_BLOCKS
    );
    const timeRemainingMs = Math.max(TOTAL_EXPECTED_MS - elapsedMs, 0);
    const progress = Math.min(elapsedMs / TOTAL_EXPECTED_MS, 1);
    const overtimeRatio =
      elapsedMs > TOTAL_EXPECTED_MS
        ? (elapsedMs - TOTAL_EXPECTED_MS) / TOTAL_EXPECTED_MS
        : 0;

    return {
      blocksElapsed,
      totalBlocks: TOTAL_BLOCKS,
      progressPercent: isExecuted ? 100 : progress * 100,
      timeRemainingMs: isExecuted ? 0 : timeRemainingMs,
      elapsedMs,
      overtimeRatio,
      createdAt,
    };
  }, [bridgeTransaction, currentTime, isExecuted]);

  const detailsContentId = useMemo(
    () => `bridge-details-${bridgeTransaction.messageId}`,
    [bridgeTransaction.messageId]
  );

  const steps = useMemo(() => {
    const base = [
      { label: "Deposit received", status: "completed" as const },
      {
        label: "Processing",
        status: isFailed
          ? ("attention" as const)
          : isExecuted
          ? ("completed" as const)
          : ("current" as const),
      },
      {
        label: "Delivered",
        status: isExecuted
          ? ("completed" as const)
          : isFailed
          ? ("attention" as const)
          : ("pending" as const),
      },
    ];
    return base;
  }, [isExecuted, isFailed]);

  const primaryMessage = isFailed
    ? "Needs attention - contact support."
    : isExecuted
    ? "Delivered - your funds are on PulseChain."
    : blockProgress.overtimeRatio > 0.5
    ? "Still processing - taking longer than usual."
    : `Bridge in progress - ${formatEta(
        blockProgress.timeRemainingMs,
        isExecuted,
        isFailed
      )}.`;

  const reassurance = isFailed
    ? "We hit an issue submitting the payout. Please open a support ticket."
    : isExecuted
    ? "Ready for your next step."
    : blockProgress.overtimeRatio > 0.5
    ? "Hang tight. We're still relaying your funds."
    : "This runs in the background. You can start another bridge now.";

  const statusPill = isFailed
    ? {
        text: "Attention",
        classes: "bg-danger/10 text-danger border-danger/40",
      }
    : isExecuted
    ? {
        text: "Delivered",
        classes: "bg-success/10 text-success border-success/50",
      }
    : {
        text: "In progress",
        classes: "bg-warning/10 text-warning border-warning/40",
      };

  const etaCopy = formatEta(
    blockProgress.timeRemainingMs,
    isExecuted,
    isFailed
  );

  const overtimeMessage =
    !isExecuted &&
    !isFailed &&
    blockProgress.overtimeRatio > 0.5 &&
    "It's taking longer than usual. Check troubleshooting.";

  const depositAmount = (() => {
    try {
      const numeric = Number(formatUnits(bridgeTransaction.amount, bridgeTransaction.tokenDecimals));
      if (!Number.isFinite(numeric)) return "0";
      if (numeric === 0) return "0";
      if (numeric < 0.0001) return numeric.toExponential(2);
      return formatNumber(numeric, { maxFractionDigits: 6 });
    } catch {
      return bridgeTransaction.amount;
    }
  })();

  const progressAriaText = isFailed
    ? "Needs attention"
    : isExecuted
    ? "Delivered"
    : blockProgress.overtimeRatio > 0.5
    ? "Taking longer than usual"
    : etaCopy || undefined;

  const handleCopy = async (
    value: string | undefined | null,
    setCopied: Dispatch<SetStateAction<boolean>>
  ) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  const helpHref =
    "https://docs.pulsechainramp.com/support#bridge-order-troubleshooting";

  const handleSaveReceipt = () => {
    if (!bridgeTransaction) return;

    const depositChain = getChainName(bridgeTransaction.sourceChainId);
    const destinationChain = getChainName(bridgeTransaction.targetChainId);
    const sourceExplorer = getExplorerUrl(
      bridgeTransaction.sourceChainId,
      bridgeTransaction.sourceTxHash
    );
    const targetExplorer = getExplorerUrl(
      bridgeTransaction.targetChainId,
      bridgeTransaction.targetTxHash
    );
    const createdAt = formatTimestamp(bridgeTransaction.createdAt);
    const completedAt = formatTimestamp(bridgeTransaction.targetTimestamp);
    const statusLabel = isFailed
      ? "Attention"
      : isExecuted
      ? "Delivered"
      : "In progress";

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Bridge Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #0d0d12; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtle { color: #5f6275; font-size: 13px; }
    .section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #dcdfe4; }
    .row { display: flex; justify-content: space-between; margin-top: 8px; }
    .label { font-size: 12px; text-transform: uppercase; color: #5f6275; letter-spacing: 0.05em; }
    .value { font-size: 16px; font-weight: 600; margin-top: 4px; }
    .hash { font-family: Consolas, monospace; font-size: 13px; }
    a { color: #0066ff; text-decoration: none; }
  </style>
</head>
<body>
  <h1>Bridge Receipt</h1>
  <div class="subtle">Order ID: ${bridgeTransaction.messageId}</div>
  <div class="section">
    <div class="label">Status</div>
    <div class="value">${statusLabel}</div>
  </div>
  <div class="section">
    <div class="label">Deposit (${depositChain})</div>
    <div class="value">${depositAmount} ${
      bridgeTransaction.tokenSymbol
    }</div>
    <div class="hash">${bridgeTransaction.sourceTxHash ?? "--"}</div>
    <div class="subtle">Created: ${createdAt}</div>
    ${
      sourceExplorer
        ? `<div><a href="${sourceExplorer}" target="_blank" rel="noreferrer">View on explorer</a></div>`
        : ""
    }
  </div>
  <div class="section">
    <div class="label">Destination (${destinationChain})</div>
    <div class="value">${depositAmount} ${
      bridgeTransaction.tokenSymbol
    }</div>
    <div class="hash">${bridgeTransaction.targetTxHash ?? "--"}</div>
    <div class="subtle">Completed: ${completedAt}</div>
    ${
      targetExplorer
        ? `<div><a href="${targetExplorer}" target="_blank" rel="noreferrer">View on explorer</a></div>`
        : ""
    }
  </div>
</body>
</html>`;

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printWindow?.document || printFrame.contentDocument;

    if (!printWindow || !printDocument) {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      window.scrollTo(0, 0);
      window.print();
      return;
    }

    const cleanup = () => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
    };

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(cleanup, 100);
    };

    const handleReady = () => {
      triggerPrint();
      printFrame.onload = null;
    };

    printFrame.onload = handleReady;
    printDocument.open();
    printDocument.write(html);
    printDocument.close();

    if (printDocument.readyState === "complete") {
      handleReady();
    }
  };

  return (
    <motion.div className="space-y-6 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPill.classes}`}
          >
            {statusPill.text}
          </span>
          <div>
            <div className="text-lg font-semibold text-text">Bridge Order</div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>
                ID: {bridgeTransaction.messageId.slice(0, 6)}...
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(bridgeTransaction.messageId, setCopyMessageId)
                }
                className="text-primary underline-offset-4 hover:underline"
              >
                {copyMessageId ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-bg-surface p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div aria-live="polite" role="status">
            <p className="text-xl font-semibold text-text">{primaryMessage}</p>
            <p className="mt-1 text-sm text-text-muted">{reassurance}</p>
          </div>
          {!isExecuted && pollingError && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <svg
                className="h-3.5 w-3.5 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v6h6M20 20v-6h-6M4 14v6h6M20 10V4h-6"
                />
              </svg>
              <span>Trying again...</span>
            </div>
          )}
        </div>

        <div
          className="mt-4"
          role="progressbar"
          aria-valuenow={Math.round(blockProgress.progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={progressAriaText}
        >
          <div className="h-2 w-full rounded-full bg-border/60">
            <div
              className={`h-2 rounded-full ${
                isFailed
                  ? "bg-danger"
                  : isExecuted
                  ? "bg-success"
                  : "bg-warning"
              } transition-all`}
              style={{ width: `${blockProgress.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step.status === "completed"
                    ? "border-success bg-success/10 text-success"
                    : step.status === "current"
                    ? "border-warning bg-warning/10 text-warning"
                    : step.status === "attention"
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-border text-text-muted"
                }`}
              >
                {step.status === "completed" ? (
                  <svg
                    className="h-5 w-5"
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
                ) : step.status === "attention" ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">
                    {index + 1}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{step.label}</p>
                <p className="text-xs text-text-muted">
                  {(() => {
                    if (step.label === "Deposit received") return "Done";
                    if (step.label === "Delivered") {
                      if (isExecuted) return "Done";
                      if (isFailed || step.status === "attention")
                        return "Needs help";
                      return "Waiting";
                    }
                    if (step.status === "completed") return "Done";
                    if (step.status === "attention") return "Needs help";
                    if (step.label === "Processing") return "In progress";
                    return "Waiting";
                  })()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {overtimeMessage && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
            {overtimeMessage}{" "}
            <a
              href={helpHref}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline-offset-4 hover:underline"
            >
              Troubleshooting
            </a>
          </div>
        )}

      </div>
      <div className="mt-6 rounded-xl border border-border bg-bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text">
          <div>
            <span className="font-semibold">From:</span>{" "}
            <span className="text-text">
              {depositAmount} {bridgeTransaction.tokenSymbol} on{" "}
              {getChainName(bridgeTransaction.sourceChainId)}
            </span>
          </div>
          <svg
            className="h-5 w-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <div>
            <span className="font-semibold">To:</span>{" "}
            <span className="text-text">
              {depositAmount} {bridgeTransaction.tokenSymbol} on{" "}
              {getChainName(bridgeTransaction.targetChainId)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg-surface">
        <button
          type="button"
          onClick={() => setDetailsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-text"
          aria-expanded={detailsOpen}
          aria-controls={detailsContentId}
        >
          Details & receipt
          <svg
            className={`h-5 w-5 text-text transition-transform ${
              detailsOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {detailsOpen && (
          <div
            className="border-t border-border px-4 py-5 text-sm text-text"
            id={detailsContentId}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-text-muted">
                  Deposit - {getChainName(bridgeTransaction.sourceChainId)}
                </p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {depositAmount} {bridgeTransaction.tokenSymbol}
                </p>
                <div className="mt-3 text-xs text-text-muted">
                  Pay-in hash
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="font-mono text-text">
                    {formatHash(bridgeTransaction.sourceTxHash)}
                  </span>
                  {bridgeTransaction.sourceTxHash && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(bridgeTransaction.sourceTxHash, setCopyPayin)
                        }
                        className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {copyPayin ? "Copied" : "Copy"}
                      </button>
                      {getExplorerUrl(
                        bridgeTransaction.sourceChainId,
                        bridgeTransaction.sourceTxHash
                      ) && (
                        <a
                          href={getExplorerUrl(
                            bridgeTransaction.sourceChainId,
                            bridgeTransaction.sourceTxHash
                          )!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          View on explorer
                        </a>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Created: {formatTimestamp(bridgeTransaction.createdAt)}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-text-muted">
                  Destination - {getChainName(bridgeTransaction.targetChainId)}
                </p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {depositAmount} {bridgeTransaction.tokenSymbol}
                </p>
                <div className="mt-3 text-xs text-text-muted">
                  Payout hash
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="font-mono text-text">
                    {formatHash(bridgeTransaction.targetTxHash)}
                  </span>
                  {bridgeTransaction.targetTxHash && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            bridgeTransaction.targetTxHash,
                            setCopyPayout
                          )
                        }
                        className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {copyPayout ? "Copied" : "Copy"}
                      </button>
                      {getExplorerUrl(
                        bridgeTransaction.targetChainId,
                        bridgeTransaction.targetTxHash
                      ) && (
                        <a
                          href={getExplorerUrl(
                            bridgeTransaction.targetChainId,
                            bridgeTransaction.targetTxHash
                          )!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          View on explorer
                        </a>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Completed: {formatTimestamp(bridgeTransaction.targetTimestamp)}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
                <span>
                  Processing block{" "}
                  <strong className="text-text">
                    {Math.min(
                      blockProgress.blocksElapsed,
                      blockProgress.totalBlocks
                    )}
                  </strong>{" "}
                  of {blockProgress.totalBlocks}
                </span>
                {!isExecuted && (
                  <span>
                    ~{formatMinutes(blockProgress.timeRemainingMs)} remaining
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border/80">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${blockProgress.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveReceipt}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Save receipt (PDF)
              </button>
              {isExecuted && onSwap && (
                <button
                  type="button"
                  onClick={onSwap}
                  className="rounded-lg border border-transparent bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
                >
                  Swap on PulseChain
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 space-y-3">
        {isExecuted && onSwap && (
          <button
            type="button"
            onClick={onSwap}
            className="w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Swap on PulseChain
          </button>
        )}
        <button
          type="button"
          onClick={onBridgeAnother}
          className="w-full rounded-xl border border-border bg-bg-page px-4 py-3 text-center text-base font-semibold text-text shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Bridge another asset
        </button>
      </div>
    </motion.div>
  );
};

export default BridgeTransactionProgress;
