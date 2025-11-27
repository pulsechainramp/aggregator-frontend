import { motion } from "framer-motion";
import React from "react";
import { useNumberFormat } from "../../../context/NumberFormatContext";

type PreviewData = {
  router: string;
  functionSignature: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountInRaw: bigint | string;
  minAmountOutRaw: bigint | string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  deadline: number;
  calldataHash: string;
};

interface SwapPreviewModalProps {
  isOpen: boolean;
  data: PreviewData | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const SwapPreviewModal: React.FC<SwapPreviewModalProps> = ({
  isOpen,
  data,
  onCancel,
  onConfirm,
}) => {
  const { formatTokenAmount, locale } = useNumberFormat();

  if (!isOpen || !data) {
    return null;
  }

  const deadline = new Date(data.deadline * 1000).toLocaleString(locale);
  const formattedAmountIn = formatTokenAmount(
    data.amountInRaw,
    data.tokenInDecimals,
    { locale }
  );
  const formattedMinAmountOut = formatTokenAmount(
    data.minAmountOutRaw,
    data.tokenOutDecimals,
    { locale }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-6 text-text shadow-floating"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <p className="text-sm font-medium text-text-muted">Transaction preview</p>
          <h3 className="text-xl font-semibold text-text">Verify before signing</h3>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Contract</dt>
            <dd className="font-mono text-xs text-text">{data.router}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Function</dt>
            <dd className="font-mono text-xs text-text">{data.functionSignature}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Send</dt>
            <dd className="font-semibold text-text">
              {formattedAmountIn} {data.tokenInSymbol}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Minimum receive</dt>
            <dd className="font-semibold text-text">
              {formattedMinAmountOut} {data.tokenOutSymbol}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Deadline</dt>
            <dd className="font-mono text-xs text-text">{deadline}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Calldata hash</dt>
            <dd className="font-mono text-xs text-text break-all">
              {data.calldataHash}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-bg-muted"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            onClick={onConfirm}
          >
            Confirm &amp; sign
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SwapPreviewModal;
