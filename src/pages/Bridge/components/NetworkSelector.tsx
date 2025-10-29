import React from "react";
import { motion } from "framer-motion";

interface NetworkSelectorProps {
  fromNetwork: "ETH" | "PLS";
  toNetwork: "ETH" | "PLS";
  onFromNetworkChange: (network: "ETH" | "PLS") => void;
  onToNetworkChange: (network: "ETH" | "PLS") => void;
}

const NETWORKS = [
  { id: "ETH" as const, name: "Ethereum", badge: "ETH" },
  { id: "PLS" as const, name: "PulseChain", badge: "PLS" },
] as const;

const ActiveIndicator = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"
  >
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  </motion.div>
);

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  fromNetwork,
  toNetwork,
  onFromNetworkChange,
  onToNetworkChange,
}) => {
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-text-muted">
        Network Selection
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section aria-labelledby="from-network">
          <label
            id="from-network"
            className="mb-2 block text-xs font-medium text-text-subtle"
          >
            From Network
          </label>
          <div className="space-y-2">
            {NETWORKS.map((network) => {
              const isActive = fromNetwork === network.id;
              return (
                <motion.button
                  key={`from-${network.id}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onFromNetworkChange(network.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "border-primary bg-primary-050 text-primary shadow-sm"
                      : "border-border bg-bg-raised text-text hover:border-primary hover:bg-primary-050/60 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface text-sm font-semibold">
                      {network.badge}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-current">
                        {network.name}
                      </div>
                      <div className="text-xs text-text-muted">{network.id}</div>
                    </div>
                    {isActive && <ActiveIndicator />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="to-network">
          <label
            id="to-network"
            className="mb-2 block text-xs font-medium text-text-subtle"
          >
            To Network
          </label>
          <div className="space-y-2">
            {NETWORKS.map((network) => {
              const isActive = toNetwork === network.id;
              return (
                <motion.button
                  key={`to-${network.id}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onToNetworkChange(network.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "border-primary bg-primary-050 text-primary shadow-sm"
                      : "border-border bg-bg-raised text-text hover:border-primary hover:bg-primary-050/60 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface text-sm font-semibold">
                      {network.badge}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-current">
                        {network.name}
                      </div>
                      <div className="text-xs text-text-muted">{network.id}</div>
                    </div>
                    {isActive && <ActiveIndicator />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg-raised p-4 text-xs text-text-muted">
        <h4 className="mb-2 text-sm font-semibold text-text">
          Bridge Information
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Estimated Time:</span>
            <span>5–10 minutes</span>
          </div>
          <div className="flex justify-between">
            <span>Bridge Fee:</span>
            <span>0.1%</span>
          </div>
          <div className="flex justify-between">
            <span>Security:</span>
            <span className="font-medium text-success">Official Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkSelector;
