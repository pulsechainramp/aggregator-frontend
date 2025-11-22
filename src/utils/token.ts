import { PulseChainConfig } from "../config/chainConfig";

type TokenLike = {
  blockchainNetwork?: string | null;
  chainId?: number | string | null;
};

export const isPulseChainToken = (token?: TokenLike | null): boolean => {
  if (!token) return false;
  const normalizedNetwork = token.blockchainNetwork?.toLowerCase();
  const parsedChainId =
    typeof token.chainId === "string"
      ? Number(token.chainId)
      : typeof token.chainId === "number"
      ? token.chainId
      : null;
  const normalizedChainId = Number.isFinite(parsedChainId) ? parsedChainId : null;

  if (!normalizedChainId && token.chainId != null) {
    console.warn("isPulseChainToken: non-numeric chainId encountered", {
      chainId: token.chainId,
    });
  }

  return (
    normalizedNetwork === "pulsechain" ||
    normalizedChainId === PulseChainConfig.chainId
  );
};
