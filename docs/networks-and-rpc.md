# Networks & RPC

> ### Key Points
> - PulseChain mainnet runs on Chain ID **369** with its own RPC endpoints and explorer.
> - The app now rotates through multiple public RPCs declared via `VITE_PULSECHAIN_RPC_URLS`, so you stay online even when one provider stalls.
> - Using "Add PulseChain" ensures wallets import the exact RPC URL, chain ID, and block explorer we currently prioritize.

**What you'll need**
- Wallet that supports custom networks  /  RPC list  /  Explorer links

**Steps**
1. In PulseChainRamp, click "Add PulseChain" and approve the EIP-3085 request.
2. If you need to add it manually, use the table below.
3. Confirm the network switch in your wallet before claiming bridge arrivals.
4. Bookmark the explorer so you can inspect PulseChain transactions quickly.
5. Rotate RPCs if responses feel slow or rate-limited.

**Network details**

| Field | Value |
| --- | --- |
| Network name | PulseChain |
| RPC URL priority order | `VITE_PULSECHAIN_RPC_URLS` (default: `https://rpc.pulsechain.com, https://pulsechain-rpc.publicnode.com, https://rpc-pulsechain.g4mm4.io`) |
| Chain ID | 369 |
| Currency symbol | PLS |
| Block explorer | https://scan.pulsechain.com |

**Common mistakes**
- Accepting a random RPC prompt from a phishing site.
- Staying on Ethereum after the bridge completes and wondering why balances are missing.
- Removing PulseChain from the wallet and forgetting how to re-add it.

**Troubleshooting**
- RPC slow? Update `VITE_PULSECHAIN_RPC_URLS` (and `VITE_ETHEREUM_RPC_URLS` for bridge reads) to include additional providers—leftmost has the highest priority—or use a dedicated private RPC.
- Network missing? Re-trigger the "Add PulseChain" prompt from Wallet.
- Explorer down? Use an alternate explorer or wait for maintenance to finish.
