import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import walletConnectModule from "@web3-onboard/walletconnect";
import { init, Web3OnboardProvider } from "@web3-onboard/react";
import { PulseChainConfig } from "./config/chainConfig";
import injectedModule from "@web3-onboard/injected-wallets";
import trustModule from "@web3-onboard/trust";
import coinbaseModule from "@web3-onboard/coinbase";

const injected = injectedModule();
const trust = trustModule();
const coinbase = coinbaseModule();

const walletConnect = walletConnectModule({
  projectId: "69cb42390db7c00d8858c388405d3324",
  requiredChains: [PulseChainConfig.chainId],
  dappUrl: "http://localhost:5173",
});

const wallets = [injected, coinbase, trust, walletConnect];

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
  theme: "dark",
  appMetadata: {
    name: "PulseChainRamp",
    icon: "https://pulsechain.com/favicon128.png",
    description: "PulseChain - Swap & Bridge",
    recommendedInjectedWallets: [
      { name: "MetaMask", url: "https://metamask.io" },
      { name: "Coinbase", url: "https://www.coinbase.com/wallet" },
      { name: "Trust Wallet", url: "https://trustwallet.com" },
      { name: "Rabby", url: "https://rabby.io/" },
      { name: "OKX Wallet", url: "https://web3.okx.com/" },
      { name: "Internet Money", url: "https://internetmoney.io/" }
    ],
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <App />
    </Web3OnboardProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
