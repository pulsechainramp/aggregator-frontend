import React from 'react';
import { motion } from 'framer-motion';

interface NetworkSelectorProps {
  fromNetwork: 'ETH' | 'PLS';
  toNetwork: 'ETH' | 'PLS';
  onFromNetworkChange: (network: 'ETH' | 'PLS') => void;
  onToNetworkChange: (network: 'ETH' | 'PLS') => void;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  fromNetwork,
  toNetwork,
  onFromNetworkChange,
  onToNetworkChange,
}) => {
  const networks = [
    { id: 'ETH', name: 'Ethereum', icon: '🔵', color: 'from-blue-500 to-blue-600' },
    { id: 'PLS', name: 'PulseChain', icon: '🟢', color: 'from-emerald-500 to-teal-500' },
  ] as const;

  return (
    <div className="bg-[#1e2030] rounded-xl p-4 border border-[#3a3f5a]">
      <h3 className="text-gray-300 font-semibold mb-4 text-sm">Network Selection</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* From Network */}
        <div>
          <label className="block text-gray-400 text-xs font-medium mb-2">
            From Network
          </label>
          <div className="space-y-2">
            {networks.map((network) => (
              <motion.button
                key={network.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onFromNetworkChange(network.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl border transition-all duration-200 ${
                  fromNetwork === network.id
                    ? `bg-gradient-to-r ${network.color} border-transparent text-white shadow-lg`
                    : 'bg-[#2b2e4a] border-[#3a3f5a] text-gray-300 hover:bg-[#3a3f5a] hover:border-[#4a4f6a]'
                }`}
              >
                <span className="text-xl">{network.icon}</span>
                <div className="text-left">
                  <div className="font-medium text-sm">{network.name}</div>
                  <div className="text-xs opacity-75">{network.id}</div>
                </div>
                {fromNetwork === network.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* To Network */}
        <div>
          <label className="block text-gray-400 text-xs font-medium mb-2">
            To Network
          </label>
          <div className="space-y-2">
            {networks.map((network) => (
              <motion.button
                key={network.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToNetworkChange(network.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl border transition-all duration-200 ${
                  toNetwork === network.id
                    ? `bg-gradient-to-r ${network.color} border-transparent text-white shadow-lg`
                    : 'bg-[#2b2e4a] border-[#3a3f5a] text-gray-300 hover:bg-[#3a3f5a] hover:border-[#4a4f6a]'
                }`}
              >
                <span className="text-xl">{network.icon}</span>
                <div className="text-left">
                  <div className="font-medium text-sm">{network.name}</div>
                  <div className="text-xs opacity-75">{network.id}</div>
                </div>
                {toNetwork === network.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-[#2b2e4a] rounded-xl border border-[#3a3f5a]">
        <h4 className="text-gray-300 font-medium mb-2 text-sm">Bridge Information</h4>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Estimated Time:</span>
            <span className="text-gray-300">5-10 minutes</span>
          </div>
          <div className="flex justify-between">
            <span>Bridge Fee:</span>
            <span className="text-gray-300">0.1%</span>
          </div>
          <div className="flex justify-between">
            <span>Security:</span>
            <span className="text-green-400">Official Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkSelector; 