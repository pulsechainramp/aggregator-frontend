import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { addTokenToWallet, waitForChain, TokenInfo, EIP1193Provider } from "../utils/walletUtils";
import useWallet from "../hooks/useWallet";
import TokenAddFallbackModal from "./TokenAddFallbackModal";
import ProviderIcon from "./ProviderIcon";
import { PulseChainConfig, EthereumConfig } from "../config/chainConfig";

interface AddToWalletButtonProps {
  token: TokenInfo;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  /** When true, hides the button if the user already has a non-zero balance of this token on the token's chain */
  hideIfHasToken?: boolean;
}

const AddToWalletButton: React.FC<AddToWalletButtonProps> = ({
  token,
  className = "",
  variant = "primary",
  size = "md",
  hideIfHasToken = true,
}) => {
  const { wallet, switchToChain, account } = useWallet();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [checkingHasToken, setCheckingHasToken] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const getAccountAddress = () => {
    const a: any = account as any;
    if (!a) return undefined;
    if (typeof a === "string") return a;
    if (Array.isArray(a)) {
      const first = a[0];
      return typeof first === "string" ? first : first?.address;
    }
    return a?.address;
  };

  const getRpcUrlForChain = (id: number): string | undefined => {
    if (id === PulseChainConfig.chainId) return PulseChainConfig.providerList?.[0];
    if (id === EthereumConfig.chainId) return EthereumConfig.providerList?.[0];
    return undefined;
  };

  const encodeBalanceOfCallData = (user: string): string => {
    const fnSelector = "0x70a08231"; // balanceOf(address)
    const addr = user.toLowerCase().replace(/^0x/, "");
    return fnSelector + addr.padStart(64, "0");
  };

  const parseHexBigInt = (hex?: string): bigint => {
    if (!hex || typeof hex !== "string") return BigInt(0);
    let h = hex.trim();
    if (h === "0x" || h === "0X" || h === "") return BigInt(0);
    try {
      return BigInt(h);
    } catch {
      try {
        if (!h.startsWith("0x") && !h.startsWith("0X")) h = "0x" + h;
        if (h.toLowerCase() === "0x") h = "0x0";
        return BigInt(h);
      } catch {
        return BigInt(0);
      }
    }
  };

  async function erc20BalanceViaProvider(provider: EIP1193Provider, tokenAddress: string, user: string): Promise<bigint> {
    const data = encodeBalanceOfCallData(user);
    const res: string = await provider.request({
      method: "eth_call",
      params: [{ to: tokenAddress, data }, "latest"],
    });
    return parseHexBigInt(res);
  }

  async function erc20BalanceViaRpc(rpcUrl: string, tokenAddress: string, user: string): Promise<bigint> {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        { to: tokenAddress, data: encodeBalanceOfCallData(user) },
        "latest",
      ],
    };
    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    if (json?.error) throw new Error(json.error?.message || "RPC error");
    return parseHexBigInt(json?.result ?? "0x0");
  }

  const isZeroAddress = (addr?: string) => !!addr && /^0x0{40}$/i.test(addr);

  async function nativeBalanceViaProvider(provider: EIP1193Provider, user: string): Promise<bigint> {
    const res: string = await provider.request({
      method: "eth_getBalance",
      params: [user, "latest"],
    });
    return parseHexBigInt(res);
  }

  async function nativeBalanceViaRpc(rpcUrl: string, user: string): Promise<bigint> {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [user, "latest"],
    };
    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    if (json?.error) throw new Error(json.error?.message || "RPC error");
    return parseHexBigInt(json?.result ?? "0x0");
  }

  // Get current network from wallet
  useEffect(() => {
    const getCurrentChainId = async () => {
      if (wallet?.provider) {
        try {
          const chainId = await wallet.provider.request({
            method: "eth_chainId",
          });
          setCurrentChainId(parseInt(chainId, 16));
        } catch (error) {
          console.error("Failed to get current chain ID:", error);
        }
      }
    };

    getCurrentChainId();

    // Listen for chain changes
    if (wallet?.provider) {
      const handleChainChanged = (chainId: string) => {
        setCurrentChainId(parseInt(chainId, 16));
      };

      wallet.provider.on("chainChanged", handleChainChanged);

      return () => {
        wallet.provider.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [wallet]);

  // Heuristic: determine if user "has" the token by checking ERC-20 balance > 0 on the token's chain
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!hideIfHasToken) return;
      const user = getAccountAddress();
      // If no user or no token info, we can't check; show button by leaving hasToken=null
      if (!user || !token?.address || !token?.chainId) {
        setHasToken(null);
        return;
      }
      setCheckingHasToken(true);
      try {
        let bal: bigint = BigInt(0);
        const zero = isZeroAddress(token.address);
        if (currentChainId === token.chainId && wallet?.provider) {
          bal = zero
            ? await nativeBalanceViaProvider(wallet.provider as unknown as EIP1193Provider, user)
            : await erc20BalanceViaProvider(wallet.provider as unknown as EIP1193Provider, token.address, user);
        } else {
          const rpc = getRpcUrlForChain(token.chainId);
          if (!rpc) {
            // Unknown chain in config; skip checking
            setHasToken(null);
            return;
          }
          bal = zero
            ? await nativeBalanceViaRpc(rpc, user)
            : await erc20BalanceViaRpc(rpc, token.address, user);
        }
        if (!cancelled) setHasToken(bal > BigInt(0));
      } catch (e) {
        console.warn("Token balance check failed:", e);
        if (!cancelled) setHasToken(null); // unknown; don't block showing the button
      } finally {
        if (!cancelled) setCheckingHasToken(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [hideIfHasToken, account, token?.address, token?.chainId, wallet, currentChainId]);

  // Check if user is on the correct network for the token
  const isOnCorrectNetwork = () => {
    if (!currentChainId) return false;
    return currentChainId === token.chainId;
  };

  // Get current network name
  const getCurrentNetworkName = () => {
    if (!currentChainId) return "Unknown";
    if (currentChainId === 1) return "Ethereum";
    if (currentChainId === 369) return "PulseChain";
    return `Chain ID ${currentChainId}`;
  };

  // Get required network name
  const getRequiredNetworkName = () => {
    if (token.chainId === 1) return "Ethereum";
    if (token.chainId === 369) return "PulseChain";
    return `Chain ID ${token.chainId}`;
  };

  const handleAddToken = async () => {
    if (!wallet) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    setIsAdding(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      // Check if user is on the correct network
      if (!isOnCorrectNetwork()) {
        setIsSwitchingNetwork(true);

        // Switch to the correct network first
        await switchToChain(token.chainId);
        try {
          await waitForChain(wallet.provider as unknown as EIP1193Provider, token.chainId);
        } catch {
          // proceed; some mobile contexts don't emit chainChanged reliably
        }

        setIsSwitchingNetwork(false);
      }

      // Now add the token to the wallet
  const success = await addTokenToWallet(token, { provider: wallet.provider as unknown as EIP1193Provider });

      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        setShowFallback(true);
      }
    } catch (error) {
      console.error("Error adding token:", error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      setShowFallback(true);
    } finally {
      setIsAdding(false);
      setIsSwitchingNetwork(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40";
      case "secondary":
        return "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40";
      case "outline":
        return "bg-transparent border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white";
      default:
        return "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-2 text-sm";
      case "md":
        return "px-4 py-2 text-base";
      case "lg":
        return "px-6 py-3 text-lg";
      default:
        return "px-4 py-2 text-base";
    }
  };

  return (
    <div className="relative">
      {/* Hide entirely when not connected or when user already has a non-zero balance of this token (heuristic) */}
      {(!getAccountAddress() || (hideIfHasToken && hasToken === true)) ? null : (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleAddToken}
        disabled={isAdding || isSwitchingNetwork}
        className={`
          ${getVariantClasses()}
          ${getSizeClasses()}
          rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {isAdding || isSwitchingNetwork ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>
              {isSwitchingNetwork ? "Switching Network..." : "Adding..."}
            </span>
          </div>
        ) : !isOnCorrectNetwork() ? (
          <div className="flex items-center space-x-2">
            <ProviderIcon provider={(wallet as any)?.provider?.provider ?? (wallet as any)?.provider ?? null} />
            <span>Switch to {getRequiredNetworkName()} & Add {token.symbol}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="relative inline-flex items-center justify-center">
              <ProviderIcon provider={(wallet as any)?.provider?.provider ?? (wallet as any)?.provider ?? null} />
            </span>
            <span>Add {token.symbol} to wallet</span>
          </div>
        )}
      </motion.button>
      )}

      {/* Success Message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-green-500 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap"
        >
          ✓ {token.symbol} added to wallet!
        </motion.div>
      )}

      {/* Error Message */}
      {showError && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap max-w-xs"
        >
          {!isOnCorrectNetwork()
            ? `Failed to switch to ${getRequiredNetworkName()}. Please try again.`
            : `Failed to add ${token.symbol}. Please try again.`}
        </motion.div>
      )}

      <TokenAddFallbackModal
        open={showFallback}
        token={token}
        onClose={() => setShowFallback(false)}
      />
    </div>
  );
};

export default AddToWalletButton;
