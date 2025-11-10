# Swap Guide

> ### Key Points
> - Routing picks the best path automatically; you can review details before confirming.
> - Approvals happen once per token per wallet.
> - Keep a little PLS on PulseChain for gas before swapping everything.

**What you'll need**
- Wallet connected to PulseChain  /  Token balance to swap  /  A small PLS buffer for gas

**Steps**
1. Open the Swap page and connect on PulseChain.
2. Choose the token you have and the token you want.
3. Review the quoted amount, slippage guardrail, and route summary.
4. Confirm the approval if it is the first time swapping that token.
5. Confirm the swap transaction and wait for the success toast.

**Common mistakes**
- Letting PLS hit zero and then being unable to pay gas.
- Setting slippage too low when liquidity is thin.

**Troubleshooting**
- Swap failed? Increase slippage slightly or try a smaller amount.
- Approval stuck? Revoke the allowance (see Allowances doc) and approve again.
- Route unavailable? Refresh quotes or wait for liquidity to return.
