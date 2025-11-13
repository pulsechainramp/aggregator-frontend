import Web3 from "web3";
import { pulsechainRpcConfig } from "./pulsechainRpcConfig";
import {
  CircuitBreakerJsonRpcProvider,
  MultiRpcHttpProvider,
  RetryingFallbackProvider,
  RpcProviderContext,
} from "./sharedRpcProviders";

const rpcContext: RpcProviderContext = {
  logPrefix: "[PulseChain RPC]",
  failureMessage: "All PulseChain RPC providers failed",
  chain: { chainId: 369, name: "pulsechain" },
  config: pulsechainRpcConfig,
};

const httpProvider = new MultiRpcHttpProvider(rpcContext);
const pulsechainWeb3 = new Web3(httpProvider as any);

const circuitBreakerProviders = pulsechainRpcConfig.urls.map(
  (url) => new CircuitBreakerJsonRpcProvider(url, rpcContext)
);

const fallbackProvider = new RetryingFallbackProvider(
  circuitBreakerProviders.map((provider, index) => ({
    provider,
    priority: index + 1,
    stallTimeout: pulsechainRpcConfig.stallTimeoutMs,
    weight: 1,
  })),
  1,
  rpcContext
);

export const getPulsechainWeb3 = () => pulsechainWeb3;

export const getPulsechainEthersProvider = () => fallbackProvider;
