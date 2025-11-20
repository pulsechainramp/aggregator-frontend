## PulseX Token Assets Workflow

Static token lists and cached logos keep Swap/Bridge/Referrals fast and offline-friendly.

### Sources

- `scripts/data/corePulsexTokens.json` — hand-curated PulseChain overrides (PLS, WPLS, PLSX, INC, bridged stables, WETH/WBTC) with optional `preferredLogoURI` and `origin` hints.
- Piteas token list (`chainId === 369` only).
- PLS369 `info.json` + `logo.png` when present (TrustWallet style).

### Schema highlights (PulseChain)

Each `PulsexToken` includes:
- `origin`: `native` | `bridged-eth` | `prefork` | `unknown`
- `originAddress`/`originChainId` for bridged tokens when known
- `tier`: `core` | `verified` | `unverified` (UI defaults to core+verified)
- `status`: `active` | `abandoned` | `spam` | `unknown`
- `logoURI`: local `/token-logos/...` path + `remoteLogoURIs` fallbacks
- `sources`: `{ core?: boolean; piteas?: boolean; pls369?: boolean }`

### Generated artifacts

- `public/pulsex-tokens.json` — curated PulseChain list used at runtime.
- `public/pulsex-tokens-prefork.json` — prefork-only subset (optional/advanced).
- `public/token-logos/pulsex/369/*.png` — cached PulseChain logos.
- `public/eth-core-tokens.json` — tiny L1 bridge list (ETH/WETH/USDC/USDT/DAI/WBTC, `isNative` on ETH).
- `public/token-logos/eth/*.png` — cached Ethereum logos.

### Build scripts

- PulseChain: `npm run build:pulsex-tokens`  
  - Loads core overrides, Piteas, and PLS369 metadata  
  - Verifies PulseChain bytecode; skips non-core tokens without contracts  
  - Classifies origin/tier/status; downloads the first working logo (core → PLS369 → Piteas)  
  - Emits `pulsex-tokens.json`, `pulsex-tokens-prefork.json`, and `scripts/reports/pulsex-token-build.json`

- Ethereum bridge mini-list: `npm run build:eth-tokens`  
  - Reads `scripts/data/ethCoreTokens.json`  
  - Downloads TrustWallet logos and writes `eth-core-tokens.json`

Requires Node 18+. Set `PULSECHAIN_RPC_URL` to point bytecode checks at a custom RPC if needed.

### Runtime usage

- Swap/Referrals load `public/pulsex-tokens.json` once. Default view hides `unverified` and `prefork`; search shows all with badges (Unverified/Prefork).
- Bridge loads `public/eth-core-tokens.json` for Ethereum and reuses the PulseX list; bridged pairs are matched via `originAddress`.
- `TokenIcon` uses local `logoURI` first, then `remoteLogoURIs`, else a symbol fallback.

### Refreshing assets

1. Update `scripts/data/corePulsexTokens.json` or `scripts/data/ethCoreTokens.json` if needed.
2. `npm install` (keep deps current).
3. Run builders: `npm run build:pulsex-tokens` and/or `npm run build:eth-tokens`.
4. Review diffs in `public/*` and `scripts/reports/*`.
5. Commit JSON + logos with related code changes.

No runtime HTTP calls are required for token metadata; everything is served locally with remote logo fallbacks only if a local image fails.
