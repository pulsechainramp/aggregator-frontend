# Safety & Trust

PulseChainRamp is run by a small operations team that manages the smart contracts, backend services, and referral program. This guide explains, in plain language, how those controls work and what protections are in place for you as a trader or referrer.

## Who Holds the Keys?
- **Deployment control with strict procedures** - The core contracts ("AffiliateRouter" and "SwapManager") are immutable once deployed. If logic ever needs to change, the operations multisig deploys a new implementation, migrates configuration, and communicates the new addresses publicly. No on-chain pause switch exists, so day-to-day changes focus on parameter updates.
- **Default referral wallet** - When a swap happens without a referral code, a designated developer wallet earns a fixed 1.0% share after the promo window. Changing this wallet follows the same controlled approval process and will be announced to the community.
- **Referral incentives** - Referral links apply the advertised rate (0.1%-3.0%) for the first three swaps, after which every swap is clipped to the smaller of the referrer’s chosen rate and the 1.0% tail cap (referrers can always opt into lower tails if they advertise <1%).

## How Does Incident Response Work?
- The contracts run continuously; because there is no on-chain pause mechanism, incidents are handled by disabling the affected UI flows, broadcasting maintenance notices, and, if necessary, deploying a patched implementation and updating the public contract addresses.
- In extreme cases, admins can **withdraw stranded tokens** from the router (for example, dust left behind by misbehaving pools). Any such move is logged on-chain and followed by a public incident report.

## How The Team Keeps Things Secure
- **Controlled change process** - Admin powers (parameter tweaks, redeployments, emergency withdrawals) are only used through documented procedures that require internal reviews and public communication. Every action is visible on-chain, and follow-up reports explain why it happened.
- **Change logs & monitoring** - Every configuration change (like updating DEX routes or the default referrer) is recorded internally.
- **Hardened backend** - The routing API enforces HTTPS, CORS allowlists, and rate limits. Referral balances are mirrored in a secure database, with health-checks ensuring the indexer stays in sync with on-chain events.
- **Upcoming audits** - Before major releases the team plans third-party reviews of contract logic, deployment procedures, and routing safety. Results will be shared with the community.

## What You Can Do To Stay Safe
- **Verify the domain** before connecting your wallet or signing a transaction.
- **Review slippage warnings** and quoted amounts; stop if the numbers look off compared to other PulseChain DEXs.
- **Check referral fees** – The app caps fees between 0.10% and 3.00%. If a link shows an unusually high percentage, confirm with the referrer before swapping.
- **Stay informed** – Status updates and incident reports are shared through official channels (Simplex, Telegram, and social feeds). Follow those outlets for the latest notices.

## Questions or Concerns?
- **Simplex Support** – Use the Simplex widget in the footer, click the "Contact Us" link
- **Telegram** – Ping the moderators or team directly at [t.me/PulseChainRamp](https://t.me/PulseChainRamp)
- **Email** – Share detailed reports (tx hashes, screenshots) via [PulseChainRamp@gmail.com](mailto:PulseChainRamp@gmail.com)

By combining technical safeguards with transparent communication, PulseChainRamp aims to give you a reliable place to bridge, swap, and manage referrals on PulseChain.
