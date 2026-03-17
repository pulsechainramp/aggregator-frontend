import { pulsechainRpcConfig } from "../rpc/pulsechainRpcConfig";
import { ethereumRpcConfig } from "../rpc/ethereumRpcConfig";

type ChainConfig = {
  chainId: number;
  chainSymbol: string;
  chainName: string;
  chainSymbolFull: string;
  chainIdHex: string;
  blockTime: number;
  providerList: string[];
  explorerUrl: string;
};

type WalletChainSetup = {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

export const PulseChainConfig: ChainConfig = {
  chainId: 369,
  chainSymbol: "PLS",
  chainName: "PulseChain",
  chainSymbolFull: "Pulse",
  chainIdHex: "0x171",
  blockTime: 3000,
  providerList: pulsechainRpcConfig.urls,
  explorerUrl: "https://ipfs.scan.pulsechain.com",
};

export const PulseChainWalletSetup: WalletChainSetup = {
  chainId: PulseChainConfig.chainId,
  chainIdHex: PulseChainConfig.chainIdHex,
  chainName: PulseChainConfig.chainName,
  nativeCurrency: {
    name: PulseChainConfig.chainSymbolFull,
    symbol: PulseChainConfig.chainSymbol,
    decimals: 18,
  },
  rpcUrls: ["https://rpc.pulsechain.com"],
  blockExplorerUrls: [PulseChainConfig.explorerUrl],
};

export const EthereumConfig: ChainConfig = {
  chainId: 1,
  chainSymbol: "ETH",
  chainName: "Ethereum",
  chainSymbolFull: "Ether",
  chainIdHex: "0x1",
  blockTime: 12000,
  providerList: ethereumRpcConfig.urls,
  explorerUrl: "https://etherscan.io",
};
