import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import walletConnectModule from "@web3-onboard/walletconnect";
import { init, Web3OnboardProvider } from "@web3-onboard/react";
import { PulseChainConfig } from "./config/chainConfig";
import createInjectedWalletInit from "./wallets/createInjectedWalletInit";
import internetMoneyWalletInit from "./wallets/internetMoneyWallet";
import { ThemeProvider } from "./theme/ThemeProvider";

const INTERNET_MONEY_WALLETCONNECT_LISTING_ID =
  "dd43441a6368ec9046540c46c5fdc58f79926d17ce61a176444568ca7c970dcd";
const INTERNET_MONEY_WALLET_IMAGE =
  "https://explorer-api.walletconnect.com/v3/logo/md/204b2240-5ce4-4996-6ec4-f06a22726900?projectId=69cb42390db7c00d8858c388405d3324";

const rabbyWallet = createInjectedWalletInit("Rabby Wallet");
const metamaskWallet = createInjectedWalletInit("MetaMask");
const trustWallet = createInjectedWalletInit("Trust Wallet");
const okxWallet = createInjectedWalletInit("OKX Wallet");
const coinbaseWallet = createInjectedWalletInit("Coinbase Wallet");
const bitgetWallet = createInjectedWalletInit("Bitget Wallet");
const braveWallet = createInjectedWalletInit("Brave Wallet");
const internetMoneyWallet = internetMoneyWalletInit;

const walletConnect = walletConnectModule({
  projectId: "69cb42390db7c00d8858c388405d3324",
  requiredChains: [PulseChainConfig.chainId],
  dappUrl: "http://localhost:5173",
  qrModalOptions: {
    explorerRecommendedWalletIds: [INTERNET_MONEY_WALLETCONNECT_LISTING_ID],
    mobileWallets: [
      {
        id: "internetmoney",
        name: "Internet Money",
        links: {
          native: "internetmoney://",
          universal: "https://internetmoney.io",
        },
      },
    ],
    walletImages: {
      internetmoney: INTERNET_MONEY_WALLET_IMAGE,
    },
  },
});

const wallets = [
  rabbyWallet,
  metamaskWallet,
  internetMoneyWallet,
  trustWallet,
  okxWallet,
  coinbaseWallet,
  braveWallet,
  walletConnect,
  bitgetWallet,
];

const web3Onboard = init({
  chains: [
    {
      id: PulseChainConfig.chainIdHex,
      token: PulseChainConfig.chainSymbol,
      label: PulseChainConfig.chainName,
      rpcUrl: PulseChainConfig.providerList[0],
    },
  ],
  wallets,
  connect: {
    autoConnectLastWallet: true,
    autoConnectAllPreviousWallet: true,
  },
  accountCenter: {
    desktop: { enabled: false },
    mobile: { enabled: false },
  },
  theme: "light",
  appMetadata: {
    name: "PulseChainRamp",
    icon: "https://pulsechain.com/favicon128.png",
    description: "PulseChain - Swap & Bridge",
    recommendedInjectedWallets: [
      { name: "Rabby Wallet", url: "https://rabby.io/" },
      { name: "MetaMask", url: "https://metamask.io" },
      { name: "Internet Money", url: "https://internetmoney.io/" },
      { name: "Trust Wallet", url: "https://trustwallet.com" },
      { name: "OKX Wallet", url: "https://www.okx.com/web3" },
      { name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet" },
      { name: "Brave Wallet", url: "https://brave.com/wallet/" },
      { name: "WalletConnect", url: "https://walletconnect.com/" },
      { name: "Bitget Wallet", url: "https://web3.bitget.com/en/wallet-download" },
    ],
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Web3OnboardProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
