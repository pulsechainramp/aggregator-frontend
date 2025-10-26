# Beta Testing Guide

Welcome to the PulseChainRamp beta. Use this checklist to exercise critical flows and report any issues. Capture transaction hashes, screenshots, device/browser details, and any unexpected behaviour when submitting feedback.

## Before You Start
- Create and connect two PulseChain wallets (one primary, one referral) funded with small test amounts of PLS, PLSX, HEX, ETH, USDC, USDT, DAI, and other ERC‑20s and PRC-20s you plan to try.
- Confirm access to a desktop browser (Chrome, Brave, or Firefox) and at least one mobile device (iOS Safari or Android Chrome).
- Make sure your referral code is at hand (Click wallet in top right, "Refer & Earn" menu item → copy link) so you can test affiliate scenarios.

## Core Scenarios

### 1. Bridge Coverage
- Initiate bridge transfers for ETH, USDC, USDT, and DAI.
- Verify quoted arrival times and confirm that target wallets receive bridged assets.
- Note any discrepancies between estimated gas/fees and actual costs.

### 2. Swap Coverage
- Execute swaps across token categories:
  - Stable ⇄ stable pairs (e.g., USDC/DAI).
  - “Ecosystem core” assets (e.g., PLS, WPLS, HEX).
  - Altcoins/mid-caps.
- Compare output amounts with reference rates on https://app.pulsex.com and other PulseChain DEXs. Call out variances greater than ±0.5%.
- Test slippage protection by setting slippage to a low threshold and attempting a volatile pair. Confirm the UI stops the swap when expected and displays the correct error.

### 3. Affiliate Flow
- Follow a referral link into the app and ensure the header shows who referred you.
- Complete a swap as the referred wallet and confirm referral earnings accrue for the referrer (check the "Refer & Earn" dashboard, in the top right wallet dropdown menu).
- As the referrer:
  - Claim a single-token reward and verify the balance resets after confirmation.
  - Change the referral fee percentage and confirm the new rate appears in the header and referral popup.

### 4. Wallet Behaviour
- Connect/disconnect different wallets (MetaMask, WalletConnect-compatible apps, Coinbase Wallet if available).
- Ensure network prompts, balance refreshes, and transaction signing work across providers.

### 5. Mobile Experience
- Repeat key swap and referral actions on a mobile browser.
- Validate responsive layout: navigation drawer, referral dashboard tables, swap form, and toasts render correctly without overflowing.

## Reporting Template
When you find an issue, include:
1. **Scenario** – e.g., “Swap altcoin to PLS with 0.3% slippage”.
2. **Wallet & device** – Wallet provider, browser version, desktop/mobile.
3. **Steps to reproduce** – Bullet the exact actions taken.
4. **Expected vs actual** – Describe the mismatch.
5. **Artifacts** – Transaction hash, screenshots, console logs if available.

## Reporting Channels
- **Simplex Support** – Use the Simplex option in the site footer, click the "Contact Us" link.
- **Telegram** – [t.me/PulseChainRamp](https://t.me/PulseChainRamp)
- **Email** – [PulseChainRamp@gmail.com](mailto:PulseChainRamp@gmail.com)

Thank you for helping us harden PulseChainRamp before the full release!
