import { Copy, ExternalLink, Plus, Wallet, X } from "lucide-react";
import { EthereumConfig, PulseChainConfig } from "../config/chainConfig";
import { TokenInfo } from "../utils/walletUtils";
import { useState } from "react";

interface TokenAddFallbackModalProps {
  open: boolean;
  token: TokenInfo;
  onClose: () => void;
}

const CHAIN_INFO: Record<number, { name: string; explorerUrl: string }> = {
  [EthereumConfig.chainId]: {
    name: "Ethereum",
    explorerUrl: EthereumConfig.explorerUrl,
  },
  [PulseChainConfig.chainId]: {
    name: "PulseChain",
    explorerUrl: PulseChainConfig.explorerUrl,
  },
};

export default function TokenAddFallbackModal({
  open,
  token,
  onClose,
}: TokenAddFallbackModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) {
    return null;
  }

  const chain =
    CHAIN_INFO[token.chainId] ?? {
      name: `Chain ID ${token.chainId}`,
      explorerUrl: "",
    };

  const explorerHref = chain.explorerUrl
    ? `${chain.explorerUrl}/token/${token.address}`
    : undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-add-modal-title"
    >
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative z-10 w-[92vw] max-w-lg rounded-lg border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-page px-3 py-1">
            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
            <Plus className="h-3 w-3 text-primary" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Manual add
            </span>
          </div>
          <button
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="space-y-4">
          <header>
            <h3
              id="token-add-modal-title"
              className="text-xl font-semibold text-text"
            >
              Add token manually
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Your wallet does not support automatic token addition in this
              context. Use the details below to add the token manually.
            </p>
          </header>

          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                Token
              </dt>
              <dd className="text-sm font-semibold text-text">
                {token.symbol} · {token.decimals} decimals
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                Network
              </dt>
              <dd className="text-sm font-semibold text-text">{chain.name}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                Contract address
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <input
                  value={token.address}
                  readOnly
                  className="flex-1 rounded-lg border border-border bg-bg-page px-3 py-2 font-mono text-xs text-text shadow-sm"
                />
                <button
                  onClick={handleCopy}
                  className="touch-target inline-flex items-center justify-center rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Copy address</span>
                </button>
                {explorerHref && (
                  <a
                    href={explorerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target inline-flex items-center justify-center rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Open in explorer</span>
                  </a>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {copied && (
            <span className="text-xs font-medium text-primary">
              Address copied to clipboard
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary-600 hover:text-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
