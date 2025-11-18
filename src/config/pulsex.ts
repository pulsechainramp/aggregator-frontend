import { getPrimaryPulsechainRpcUrl } from "../rpc/pulsechainRpcConfig";

const DEFAULT_PULSEX_STABLE_POOL_ADDRESS = "0xE3acFA6C40d53C3faf2aa62D0a715C737071511c";

const resolveAddressOverride = (
  maybeAddress: string | undefined,
  fallback: string
): string => {
  const trimmed = maybeAddress?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const stablePoolAddress = resolveAddressOverride(
  import.meta.env.VITE_PULSEX_STABLE_POOL_ADDRESS as string | undefined,
  DEFAULT_PULSEX_STABLE_POOL_ADDRESS
);

export const PulsexConfig = {
  PulsexV1FactoryAddress: "0x1715a3e4a142d8b698131108995174f37aeba10d",
  PulsexV2FactoryAddress: "0x29ea7545def87022badc76323f373ea1e707c523",
  PulsexV1RouterAddress: "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02",
  PulsexV2RouterAddress: "0x165C3410fC91EF562C50559f7d2289fEbed552d9",
  PulsexStablePoolAddress: stablePoolAddress,
  WPLSAddress: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
  RPC_URL: getPrimaryPulsechainRpcUrl(),
};
