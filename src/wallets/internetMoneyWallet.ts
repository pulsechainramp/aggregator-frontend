import { createEIP1193Provider } from "@web3-onboard/common";
import type { WalletInit, WalletModule } from "@web3-onboard/common";
import internetMoneyIconDataUrl from "../assets/internet-money.png?inline";

const INTERNET_MONEY_LABEL = "Internet Money";

type ProviderMetadata = {
  name?: unknown;
  rdns?: unknown;
  description?: unknown;
};

type MaybeEthereumProvider = Record<string, unknown> & {
  info?: ProviderMetadata;
  providerInfo?: ProviderMetadata;
  walletInfo?: ProviderMetadata;
  providers?: MaybeEthereumProvider[];
};

const identityFlags = ["isInternetMoney", "isInternetMoneyWallet", "isIMWallet"];

const extractMetadata = (provider: MaybeEthereumProvider): ProviderMetadata =>
  provider.info ?? provider.providerInfo ?? provider.walletInfo ?? {};

const normalize = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : "";

const matchesMetadata = (provider: MaybeEthereumProvider) => {
  const metadata = extractMetadata(provider);
  const fields = [
    normalize(metadata.name),
    normalize(metadata.rdns),
    normalize(metadata.description),
  ];

  return fields.some(
    (field) =>
      field.includes("internetmoney") || field.includes("internet money")
  );
};

const hasIdentityFlag = (
  provider: MaybeEthereumProvider,
  flag: string
): boolean => Boolean((provider as Record<string, unknown>)[flag]);

const isInternetMoneyProvider = (
  provider: unknown
): provider is MaybeEthereumProvider => {
  if (!provider || typeof provider !== "object") {
    return false;
  }

  const candidate = provider as MaybeEthereumProvider;

  if (identityFlags.some((flag) => hasIdentityFlag(candidate, flag))) {
    return true;
  }

  return matchesMetadata(candidate);
};

const findInternetMoneyProvider = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { ethereum } = window as typeof window & {
    ethereum?: MaybeEthereumProvider;
  };

  if (!ethereum) {
    return undefined;
  }

  if (isInternetMoneyProvider(ethereum)) {
    return ethereum;
  }

  if (Array.isArray(ethereum.providers)) {
    return ethereum.providers.find((provider) =>
      isInternetMoneyProvider(provider)
    );
  }

  return undefined;
};

const buildUnavailableMessage = () =>
  `Please <a href="https://internetmoney.io/" target="_blank" rel="noreferrer">install or enable</a> ${INTERNET_MONEY_LABEL} to continue.`;

const internetMoneyWalletInit: WalletInit = () => {
  const module: WalletModule = {
    label: INTERNET_MONEY_LABEL,
    getIcon: async () =>
      `<svg width="100%" height="100%" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <image href="${internetMoneyIconDataUrl}" x="0" y="0" width="64" height="64" preserveAspectRatio="xMidYMid meet" />
      </svg>`,
    getInterface: async () => {
      const provider = findInternetMoneyProvider();

      if (!provider) {
        throw new Error(buildUnavailableMessage());
      }

      return {
        provider: createEIP1193Provider(provider),
      };
    },
  };

  return module;
};

export default internetMoneyWalletInit;
