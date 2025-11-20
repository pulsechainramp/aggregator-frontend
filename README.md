# PulseChainRamp Frontend
Non-custodial web app for bridging, swapping, and on-ramping assets into PulseChain.

---

## TL;DR (Quickstart)

```bash
# 1) Clone
git clone https://github.com/pulsechainramp/aggregator-frontend.git && cd aggregator-frontend

# 2) Configure
cp .env.example .env   # edit SMTP settings + set VITE_BACKEND_URL / VITE_PITEAS_API_BASE_URL / VITE_QUOTE_SIGNER_ADDRESS

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
- **Infra (if used):** PulseChain RPCs (`VITE_PULSECHAIN_RPC_URLS`), Ethereum RPCs (`VITE_ETHEREUM_RPC_URLS`), SMTP account for contact emails

### Local Development
```bash
npm install
npm run dev
```

### Configuration (ENV)

> Optional: set `VITE_SOURCEMAP=true` before `npm run build` to ship source maps. Backend REST calls use `VITE_BACKEND_URL` (HTTPS enforced for production builds); override it in `.env` for local APIs such as `http://localhost:3000/`.

| Key | Example | Required | Description |
|---|---|:--:|---|
| `VITE_BACKEND_URL` | `https://api.pulsechainramp.com/` | yes | Base URL for routing API (`/quote`, `/referral`, etc.). Must be HTTPS in production. |
| `VITE_PITEAS_API_BASE_URL` | `https://sdk.piteas.io` | yes | Direct browser endpoint for Piteas quotes. Each client uses its own IP quota. |
| `VITE_PULSECHAIN_RPC_URLS` | `https://rpc.pulsechain.com,https://pulsechain-rpc.publicnode.com,https://rpc-pulsechain.g4mm4.io,https://pulsechain.rpc.thirdweb.com` | yes | Comma-separated PulseChain RPC pool (leftmost wins unless it stalls). |
| `VITE_ETHEREUM_RPC_URLS` | `https://ethereum-rpc.publicnode.com,https://ethereum.public.blockpi.network/v1/rpc/public,https://eth.drpc.org` |  | Comma-separated Ethereum RPC pool for read-only bridge operations. |
| `VITE_RPC_STALL_TIMEOUT_MS` / `VITE_ETH_RPC_STALL_TIMEOUT_MS` | `1200` |  | Milliseconds to wait before treating an RPC request as stalled (PulseChain / Ethereum override). |
| `VITE_RPC_RETRY_COUNT` / `VITE_ETH_RPC_RETRY_COUNT` | `2` |  | Number of additional failover rounds before surfacing an error (PulseChain / Ethereum override). |
| `VITE_RPC_RETRY_DELAY_MS` / `VITE_ETH_RPC_RETRY_DELAY_MS` | `200` |  | Delay between retry rounds when all RPCs report transient failures. |
| `VITE_RPC_COOLDOWN_MS` / `VITE_ETH_RPC_COOLDOWN_MS` | `30000` |  | Duration to keep a flapping RPC out of rotation once it fails a health check. |
| `VITE_QUOTE_SIGNER_ADDRESS` | `0xf39F...` | yes | Address of the backend attestation signer. Used to verify `/quote/attest` signatures before enabling swaps. |
| `VITE_SIWE_CHAIN_IDS` | `369,943` |  | Comma-separated list of chain IDs that SIWE challenges must match (default PulseChain mainnet only). |
| `CONTACT_SMTP_*` | Gmail/SMTP creds | optional | Needed only when deploying the contact form API. |
| `VITE_TX_RECEIPT_TIMEOUT_MS` | `120000` | optional | How long (ms) to wait for tx receipts before surfacing a timeout in approvals/swaps. |

---

## Usage

### UI
- Open `http://localhost:5173`.
- Click **Connect Wallet** to load Web3 Onboard (Rabby, MetaMask, WalletConnect, Coinbase Wallet).
- Use **Bridge** to move assets, **Swap** for PulseChain DEX routing, **On-Ramp** to pick fiat providers, **Refer & Earn** to pay the one-time on-chain fee (when required), complete SIWE auth, claim rewards, and manage referral earnings.
- When the **referral creation fee** feature is enabled on the smart contracts, even the **default referrer** must submit that transaction once before the `/referrals` page will surface their earnings/claims.

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
- **Quote attestation:** The swap page fetches Piteas quotes directly but requires `/quote/attest` signatures from the backend before allowing wallet execution. Calldata is decoded locally and previewed to the user.
- **Headers:** Vercel deploy sets CSP, Referrer-Policy, COOP, and Permission-Policy defaults.
- **CSP telemetry:** Inline styles are removed so CSP can block DOM injection. Violations are reported to `/api/csp-report`, and the endpoint simply logs events for future alerting.

---

## Observability
- **Logging:** Console logs for contract polling and contact errors; surfaced in browser devtools or Vercel function logs.

---

## Deployment
- **Platform:** Vercel (configured by `vercel.json` for build/run commands and SPA rewrites).
- **Artifacts:** Static build in `build/` served via Vercel's CDN; serverless API auto-deployed alongside.
- **Environments:** Point staging/production projects at the desired PulseChain backend URL via `VITE_BACKEND_URL` (set per-environment in `.env`/Vercel project settings).

### Onramp Allowlist Sync
Onramp CTAs are pinned to a generated allowlist. Whenever `routing-api/src/data/onramps_providers.json` changes (new provider, updated domain, etc.), regenerate the allowlist before deploying:

```bash
cd ../routing-api
node scripts/sync-onramp-allowlist.js
```

This writes both `routing-api/src/data/allowedProviderHosts.ts` and `aggregator-frontend/src/data/allowedProviderHosts.ts`. Commit the refreshed files in each repo so the backend and frontend enforce the same vetted hostnames.

---

## Troubleshooting / FAQ
- **Wallet actions stuck on “No provider”:** Confirm a wallet is connected through Web3 Onboard; refresh if the provider was disconnected.
- **Bridge or swap quotes fail:** Verify the backend at `BackendURL` is reachable or swap the constant to a local routing API before retrying.
