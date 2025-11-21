# Fetch sorted balances in token popup with Multicall integration

## Summary
- Add a lightweight Multicall client/ABI and expose the Multicall address via env/const for PulseChain balance reads.
- Extend swap state with cached token balances keyed by account, guarded by request ids, chunked multicall fetching, and clear actions on account/chain change.
- Update the Token popup to fetch balances when opened, sort by balance then core priority, display per-row balances with fallbacks, and clean up test utilities (SIWE mocks, sorting tests).

## Testing
- `npm test -- --runInBand`
