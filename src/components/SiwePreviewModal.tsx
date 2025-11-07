import { motion } from "framer-motion";
import React from "react";
import { SiweChallengePreview } from "../utils/siwe";

interface Props {
  data: SiweChallengePreview;
  onConfirm: () => void;
  onCancel: () => void;
}

const Row = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between text-sm">
    <span className="text-text-muted">{label}</span>
    <span className="font-mono text-right text-text break-words">
      {value || "-"}
    </span>
  </div>
);

const SiwePreviewModal: React.FC<Props> = ({ data, onConfirm, onCancel }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70"
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface p-6 text-text shadow-floating"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <p className="text-sm font-medium text-text-muted">
            Sign-In With Ethereum
          </p>
          <h3 className="text-xl font-semibold text-text">
            Verify this request before signing
          </h3>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-bg-muted/50 p-4">
          <Row label="Domain" value={data.domain} />
          <Row label="Address" value={data.address} />
          <Row label="Statement" value={data.statement || "-"} />
          <Row label="URI" value={data.uri} />
          <Row label="Chain ID" value={data.chainId.toString()} />
          <Row label="Nonce" value={data.nonce} />
          {data.issuedAt && <Row label="Issued At" value={data.issuedAt} />}
          {data.expirationTime && (
            <Row label="Expires At" value={data.expirationTime} />
          )}
        </div>

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
            Sign in wallet
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SiwePreviewModal;
