import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import useWallet from "../hooks/useWallet";

interface NetworkIndicatorProps {
  className?: string;
}

const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({ className = "" }) => {
  const {
    currentChainId,
    getCurrentNetworkName,
    getCurrentNetworkSymbol,
    isOnEthereum,
    isOnPulseChain,
    switchToPulsechain,
    switchToEthereum,
    wallet,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  if (!wallet || !currentChainId) {
    return null;
  }

  const statusColor = isOnPulseChain()
    ? "bg-success"
    : isOnEthereum()
    ? "bg-primary"
    : "bg-warning";

  const handlePulseChain = async () => {
    await switchToPulsechain();
    setIsOpen(false);
  };

  const handleEthereum = async () => {
    await switchToEthereum();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus shadow-sm"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColor}`} aria-hidden="true" />
        <span>Network</span>
        <span className="font-semibold">{getCurrentNetworkSymbol()}</span>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute right-0 mt-2 w-60 rounded-lg border border-border bg-bg-surface shadow-md"
          role="menu"
        >
          <div className="p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Select network
            </div>

            <button
              onClick={handlePulseChain}
              disabled={isOnPulseChain()}
              className={`flex w-full items-start justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                isOnPulseChain()
                  ? "border-primary bg-primary-050 text-primary cursor-default"
                  : "border-border text-text hover:border-primary hover:bg-primary-050/60"
              }`}
              role="menuitem"
            >
              <span>
                <span className="block text-sm font-semibold text-text">
                  PulseChain
                </span>
                <span className="text-xs text-text-muted">PLS</span>
              </span>
              {isOnPulseChain() && (
                <span className="text-xs font-semibold text-primary">Active</span>
              )}
            </button>

            <button
              onClick={handleEthereum}
              disabled={isOnEthereum()}
              className={`flex w-full items-start justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                isOnEthereum()
                  ? "border-primary bg-primary-050 text-primary cursor-default"
                  : "border-border text-text hover:border-primary hover:bg-primary-050/60"
              }`}
              role="menuitem"
            >
              <span>
                <span className="block text-sm font-semibold text-text">
                  Ethereum
                </span>
                <span className="text-xs text-text-muted">ETH</span>
              </span>
              {isOnEthereum() && (
                <span className="text-xs font-semibold text-primary">Active</span>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NetworkIndicator;
