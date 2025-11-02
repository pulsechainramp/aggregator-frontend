# PulseChainRamp Frontend
Non-custodial web app for bridging, swapping, and on-ramping assets into PulseChain.

---

## TL;DR (Quickstart)

```bash
# 1) Clone
git clone https://github.com/pulsechainramp/aggregator-frontend.git && cd aggregator-frontend

# 2) Configure
cp .env.example .env   # edit SMTP settings + set VITE_PITEAS_API_BASE_URL

# 3) Run
npm run dev

# 4) Open
http://localhost:5173
```

---

## Support the Project
- PulseChain donations: `0x137e0A3205023f78535Ed303DAED89FCde8d87c2`

---

## What’s Inside (Features)
- **Smart On-Ramp Discovery** — Geo-detect users and list compliant providers with deep links.
- **Swap Aggregator** — Quote PulseChain DEX routes, auto-handle approvals, and execute via the AffiliateRouter smart contract.
- **Cross-Chain Bridge** — Move ERC20s between Ethereum and PulseChain with live fee/amount estimates and balance polling.
- **Referral Hub** — Fetch personal codes, review tokenized earnings, bulk-claim rewards, and update fee basis points.

---

## Installation & Setup

### Prerequisites
- **Runtime:** Node 20+
- **Package manager:** npm 10+
- **Infra (if used):** PulseChain RPC (`https://rpc.pulsechain.com`), Ethereum RPC (`https://ethereum-rpc.publicnode.com`), SMTP account for contact emails

### Local Development
```bash
npm install
npm run dev
```

### Configuration (ENV)

> Optional: set `VITE_SOURCEMAP=true` before `npm run build` to ship source maps. Backend REST calls default to `https://pulsechainramp.com/`; adjust `src/const/swap.ts` for local APIs.

---

## Usage

### UI
- Open `http://localhost:5173`.
- Click **Connect Wallet** to load Web3 Onboard (Rabby, MetaMask, WalletConnect, Coinbase Wallet).
- Use **Bridge** to move assets, **Swap** for PulseChain DEX routing, **On-Ramp** to pick fiat providers, **Refer & Earn** to claim rewards.

---

## Project Structure
```
aggregator-frontend/
  api/                # Vercel serverless handlers (contact form)
  public/             # Static assets served by Vite
  src/
    components/       # UI building blocks (wallet, banners, modals)
    pages/            # Route-level views (Bridge, Swap, Onramp, Referrals)
    store/            # Redux Toolkit slices (bridge, swap, referral)
    contracts/        # Web3 helpers for BridgeManager & AffiliateRouter
    const/            # Shared constants (addresses, backend URL)
    utils/            # Formatting, referral helpers, hooks
  docs/               # Product overview and supporting docs
```

**Key scripts**
| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with local API proxy |
| `npm run build` | Compile production bundle to `build/` |
| `npm run preview` | Serve the built app for smoke-testing |
| `npm run test` | Run Vitest suite in jsdom |
| `npm run test:ui` | Open Vitest UI runner |

---

## Architecture & Design
- **React + Vite + TypeScript** drive a single-page app with Tailwind utility styling.
- **Redux Toolkit slices** (`swapSlice`, `bridgeSlice`, `referralSlice`) coordinate async flows, balances, and contract state.
- **Web3 Onboard + ethers/web3** manage wallet sessions, allowance checks, approvals, and swap/bridge execution.
- **Backend integrations** hit `BackendURL` for bridge token lists, PulseX quotes, geo lookup, and referral metadata, while `VITE_PITEAS_API_BASE_URL` is invoked from the browser for Piteas swap routes (debounced + rate limited).
- **Contact serverless function** (`api/contact.ts`) runs on Vercel and mirrors locally via a Vite dev middleware.
- **Security headers** enforced through `vercel.json` (CSP, COOP, frame/permission policies).

---

## Testing & Quality
- **Test types:** Unit/component tests with Vitest + React Testing Library.
- **Run:** `npm run test`
- **Lint/format:** Tailwind + Prettier conventions baked into the codebase (no explicit npm scripts yet).

---

## Security & Compliance
- **Secrets:** Loaded via `.env` into serverless functions; never committed.
- **Auth:** Wallet-based; no custodial accounts or passwords.
- **Validation:** Client-side checks for bridge/swap inputs.
- **Headers:** Vercel deploy sets CSP, Referrer-Policy, COOP, and Permission-Policy defaults.

---

## Observability
- **Logging:** Console logs for contract polling and contact errors; surfaced in browser devtools or Vercel function logs.

---

## Deployment
- **Platform:** Vercel (configured by `vercel.json` for build/run commands and SPA rewrites).
- **Artifacts:** Static build in `build/` served via Vercel’s CDN; serverless API auto-deployed alongside.
- **Environments:** Point staging/production projects at the desired PulseChain backend URL via `src/const/swap.ts` (and matching `.env` secrets).

---

## Troubleshooting / FAQ
- **Wallet actions stuck on “No provider”:** Confirm a wallet is connected through Web3 Onboard; refresh if the provider was disconnected.
- **Bridge or swap quotes fail:** Verify the backend at `BackendURL` is reachable or swap the constant to a local routing API before retrying.
