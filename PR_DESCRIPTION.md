# PR Title: Improve Start page checklist UX, tracking, and event-driven updates

## Summary
- Redesign the /start checklist UI to use numbered circles that flip to green checks, with cleaner completed states and collapsible completed cards on mobile.
- Track start progress (wallet, funding, bridge, swap) locally, mark bridge/swap completion from our own flows, and remove SIWE-triggered bridge checks.
- Add event-driven, rate-limited auto-checks (mount, visibility, account/chain changes, navigation to /start) with debounce and per-account intervals to avoid backend hammering and update-depth loops.

## Testing
- [ ] Not run (UI/Redux changes only)
