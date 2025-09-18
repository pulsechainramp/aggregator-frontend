import { useConnectWallet } from "@web3-onboard/react";
import { useCallback, useEffect, useState } from "react";
import { PulseChainConfig, EthereumConfig } from "../config/chainConfig";

const useWallet = () => {
  const [{ wallet }, connect, disconnect] = useConnectWallet();
  const account = wallet ? wallet.accounts[0].address : "";
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Get current chain ID
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
      } else {
        setCurrentChainId(null);
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

  const switchToChain = useCallback(
    async (chainId: number) => {
      if (!wallet?.provider) return;

      const chainConfig = chainId === 1 ? EthereumConfig : PulseChainConfig;

      try {
        await wallet.provider.request({
              method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
      } catch (error) {
        console.error(`Failed to switch to chain ${chainId}:`, error);
        try {
          const provider = wallet.provider;
          if (provider && provider.request) {
            await wallet.provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: chainConfig.chainIdHex,
                  chainName: chainConfig.chainName,
                  nativeCurrency: {
                    name: chainConfig.chainSymbol,
                    symbol: chainConfig.chainSymbol,
                    decimals: 18,
                  },
                  rpcUrls: chainConfig.providerList,
                  blockExplorerUrls: [chainConfig.explorerUrl],
                },
              ],
            });
          }
        } catch (addError) {
          console.error(`Failed to add chain ${chainId}:`, error);
        }
      }
    },
    [wallet]
  );

  const switchToPulsechain = useCallback(async () => {
    await switchToChain(PulseChainConfig.chainId);
  }, [switchToChain]);

  const switchToEthereum = useCallback(async () => {
    await switchToChain(EthereumConfig.chainId);
  }, [switchToChain]);

  useEffect(() => {
    if (wallet && wallet.provider) {
      (window as any).provider = wallet.provider;
    } else {
      delete (window as any).provider;
    }
  }, [wallet]);

  const connectWallet = useCallback(async () => {
    const wallets = await connect();
    if (wallets[0] != null) {
      (window as any).provider = wallets[0].provider as any;
    }
  }, [connect]);

  const disconnectWallet = useCallback(async () => {
    if (wallet?.label) {
      await disconnect({ label: wallet.label });
    }
  }, [disconnect, wallet]);

  // Helper functions for network detection
  const getCurrentNetworkName = () => {
    if (currentChainId === 1) return "Ethereum";
    if (currentChainId === 369) return "PulseChain";
    return "Unknown";
  };

  const getCurrentNetworkSymbol = () => {
    if (currentChainId === 1) return "ETH";
    if (currentChainId === 369) return "PLS";
    return "?";
  };

  const isOnEthereum = () => currentChainId === 1;
  const isOnPulseChain = () => currentChainId === 369;

  return {
    account,
    connectWallet,
    disconnectWallet,
    switchToPulsechain,
    switchToEthereum,
    switchToChain,
    wallet,
    currentChainId,
    getCurrentNetworkName,
    getCurrentNetworkSymbol,
    isOnEthereum,
    isOnPulseChain,
  };
};

export default useWallet;
