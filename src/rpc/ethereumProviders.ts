import Web3 from "web3";
import { ethereumRpcConfig } from "./ethereumRpcConfig";
import {
  CircuitBreakerJsonRpcProvider,
  MultiRpcHttpProvider,
  RetryingFallbackProvider,
  RpcProviderContext,
} from "./sharedRpcProviders";

const rpcContext: RpcProviderContext = {
  logPrefix: "[Ethereum RPC]",
  failureMessage: "All Ethereum RPC providers failed",
  chain: { chainId: 1, name: "homestead" },
  config: ethereumRpcConfig,
};

const httpProvider = new MultiRpcHttpProvider(rpcContext);
const ethereumWeb3 = new Web3(httpProvider as any);

const circuitBreakerProviders = ethereumRpcConfig.urls.map(
  (url) => new CircuitBreakerJsonRpcProvider(url, rpcContext)
);

const fallbackProvider = new RetryingFallbackProvider(
  circuitBreakerProviders.map((provider, index) => ({
    provider,
    priority: index + 1,
    stallTimeout: ethereumRpcConfig.stallTimeoutMs,
    weight: 1,
  })),
  1,
  rpcContext
);

export const getEthereumWeb3 = () => ethereumWeb3;

export const getEthereumEthersProvider = () => fallbackProvider;
