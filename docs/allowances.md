# Allowances & Approvals

> ### Key Points
> - Approvals let a smart contract spend a specific token on your behalf.
> - You usually approve once per token; revoking resets the allowance.
> - Failed approvals often mean wrong network, low gas, or a stuck nonce.

**What you'll need**
- Wallet connected to the correct network  /  Token contract address  /  Optional revoke tool

**Steps**
1. When prompted, confirm the approval transaction before the swap or bridge.
2. Check the token and contract address match what you expect.
3. If you want tighter control, edit the allowance amount to the exact figure.
4. After a campaign, revoke the allowance using the Allowance page or a third-party tool.
5. Retry the main action (swap or bridge) once approval succeeds.

**Common mistakes**
- Approving on PulseChain when the token actually lives on Ethereum (or vice versa).
- Setting allowance to zero unintentionally, causing future swaps to fail.
- Forgetting to keep PLS or ETH for the approval gas fee.

**Troubleshooting**
- Approval stuck pending? Speed it up or cancel, then try again with higher gas.
- Need to revoke? Use [Revoke.cash](https://revoke.cash) or a similar tool, then approve again.
- Wallet popup not appearing? Unlock the wallet window-it may be behind your browser.
