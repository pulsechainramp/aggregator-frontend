# Quotes & Slippage

> ### Key Points
> - Quotes show the best route PulseChainRamp can find across available liquidity.
> - Slippage is the max price movement you are willing to accept.
> - Tight slippage protects you but can cause failed swaps during volatility.

**What you'll need**
- Wallet connected to PulseChain  /  Token pair in mind  /  Awareness of market volatility

**Steps**
1. Enter the amount you want to swap and review the quoted output.
2. Check the route details to see which pools or DEXs the trade will touch.
3. Adjust the slippage control only if necessary (the default fits most trades).
4. Confirm the approval (if needed) and then the swap transaction.
5. Monitor the confirmation toast; if it fails, revisit the slippage setting.

**Common mistakes**
- Setting slippage below 0.1% for volatile tokens, causing repeated failures.
- Forgetting that referral fees slightly lower the final output.
- Ignoring minimum received amounts before confirming.

**Troubleshooting**
- Price moved too much? Wait a minute and request a new quote.
- Need higher slippage? Increase gradually (e.g., 0.5% to 1%) rather than jumping to large values.
- Getting sandwich-attacked? Trade in smaller chunks or during calmer liquidity windows.
