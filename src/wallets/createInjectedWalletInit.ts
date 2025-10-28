import type { WalletHelpers, WalletInit, WalletModule } from "@web3-onboard/common";
import injectedModule from "@web3-onboard/injected-wallets";

const warnMissingWallet = (label: string) => {
  if (typeof window !== "undefined") {
    console.warn(
      `[createInjectedWalletInit] Wallet "${label}" could not be initialised.`
    );
  }
};

export const createInjectedWalletInit = (label: string): WalletInit => {
  const injected = injectedModule({
    displayUnavailable: [label],
    sort: (wallets) => wallets.filter((wallet) => wallet.label === label),
  });

  return (helpers: WalletHelpers) => {
    const result = injected(helpers);
    const wallets: WalletModule[] = Array.isArray(result)
      ? result
      : result
      ? [result]
      : [];
    const match = wallets.find((wallet) => wallet.label === label);

    if (!match) {
      warnMissingWallet(label);
      return null;
    }

    return match;
  };
};

export default createInjectedWalletInit;
