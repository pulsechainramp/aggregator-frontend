import React, { useState } from "react";
import useWallet from "../hooks/useWallet";

const CustomConnectButton: React.FC = () => {
  const { connectWallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <button
      className="touch-target inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:border-primary-600 hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
      onClick={handleConnect}
      disabled={isConnecting}
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
};

export default CustomConnectButton;
