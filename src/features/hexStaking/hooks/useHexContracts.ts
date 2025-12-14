import { useCallback, useMemo } from "react";
import { BrowserProvider, JsonRpcProvider } from "ethers";
import useWallet from "../../../hooks/useWallet";
import { getPrimaryPulsechainRpcUrl } from "../../../rpc/pulsechainRpcConfig";
import { HexNetwork, HEX_NETWORKS } from "../types";
import { getHexContract, type HexContract } from "../hexClient";

export const useHexContracts = () => {
  const { wallet } = useWallet();

  const pulseReadProvider = useMemo(
    () => new JsonRpcProvider(getPrimaryPulsechainRpcUrl(), "any"),
    []
  );

  const getReadContract = useCallback(
    (_network: HexNetwork): HexContract => {
      const chainId = HEX_NETWORKS.pulse.chainId;
      return getHexContract(pulseReadProvider, chainId);
    },
    [pulseReadProvider]
  );

  const getWriteContract = useCallback(
    async (_network: HexNetwork): Promise<HexContract> => {
      if (!wallet?.provider) {
        throw new Error("Connect your wallet to continue.");
      }
      const expectedChainId = HEX_NETWORKS.pulse.chainId;
      const browserProvider = new BrowserProvider(wallet.provider as any, "any");
      const signer = await browserProvider.getSigner();
      const networkInfo = await browserProvider.getNetwork();
      const numericChainId =
        typeof networkInfo.chainId === "bigint"
          ? Number(networkInfo.chainId)
          : (networkInfo.chainId as number);

      if (numericChainId !== expectedChainId) {
        throw new Error(`Switch your wallet to ${HEX_NETWORKS.pulse.label}.`);
      }

      return getHexContract(signer, expectedChainId);
    },
    [wallet?.provider]
  );

  return {
    getReadContract,
    getWriteContract,
  };
};
