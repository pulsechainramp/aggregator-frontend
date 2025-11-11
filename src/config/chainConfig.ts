import { pulsechainRpcConfig } from "../rpc/pulsechainRpcConfig";
import { ethereumRpcConfig } from "../rpc/ethereumRpcConfig";

export const PulseChainConfig = {
  chainId: 369,
  chainSymbol: "PLS",
  chainName: "PulseChain",
  chainSymbolFull: "Pulse",
  chainIdHex: "0x171",
  blockTime: 3000,
  providerList: pulsechainRpcConfig.urls,
  explorerUrl: "https://scan.pulsechain.com",
};

export const EthereumConfig = {
  chainId: 1,
  chainSymbol: "ETH",
  chainName: "Ethereum",
  chainSymbolFull: "Ether",
  chainIdHex: "0x1",
  blockTime: 12000,
  providerList: ethereumRpcConfig.urls,
  explorerUrl: "https://etherscan.io",
};
