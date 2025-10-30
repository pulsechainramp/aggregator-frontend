import React, { useState } from "react";
import useWallet from "../hooks/useWallet";

type CustomConnectButtonProps = {
  variant?: "default" | "cta";
  className?: string;
};

const CustomConnectButton: React.FC<CustomConnectButtonProps> = ({
  variant = "default",
  className = "",
}) => {
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

  const baseClasses =
    "inline-flex min-h-[42px] min-w-[6rem] items-center justify-center rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:border-primary-600 hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[7.5rem] sm:px-4";

  const ctaClasses =
    "w-full rounded-xl border border-primary bg-primary-050 py-4 text-lg font-semibold text-primary transition-colors duration-200 hover:border-primary-600 hover:bg-primary-050/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60";

  const resolvedClasses =
    variant === "cta" ? ctaClasses : baseClasses;

  const mergedClasses = className
    ? `${resolvedClasses} ${className}`
    : resolvedClasses;

  return (
    <button
      className={mergedClasses}
      onClick={handleConnect}
      disabled={isConnecting}
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
};

export default CustomConnectButton;
