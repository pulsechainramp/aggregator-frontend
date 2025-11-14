import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Terms of Use for a non-custodial Web3 dApp with swaps/bridge + referrals.
// Replace all bracketed placeholders before deploying.
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_NAME = "PulseChainRamp";
const CONTACT_EMAIL = "PulseChainRamp@gmail.com";
const DMCA_AGENT_EMAIL = "PulseChainRamp@gmail.com";
const GOVERNING_LAW = "the United States of America";
const ARBITRATION_FORUM = "JAMS";
const ARBITRATION_LOCATION = "New York, New York, USA";
const AGE_MINIMUM = 18;

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <article className="prose prose-lg prose-slate dark:prose-invert prose-headings:text-black prose-headings:mt-10 prose-headings:mb-3 prose-p:text-black prose-ul:my-4 prose-li:text-black dark:prose-headings:text-slate-50 dark:prose-p:text-slate-200 dark:prose-li:text-slate-200 max-w-none space-y-4">
      <h1>Terms of Use</h1>
      <p><strong>Last updated:</strong> 04 October 2025</p>

      <p>
        These Terms of Use (“<strong>Terms</strong>”) are a binding agreement between{" "}
        <strong>{LEGAL_NAME}</strong> (“we,” “us,” or “our”)
        and each person or entity that accesses or uses our websites, interfaces, APIs,
        smart contracts, and related services (collectively, the “<strong>Services</strong>”).
        By connecting a wallet or using any part of the Services, you agree to these Terms.
        If you do not agree, do not access or use the Services.
      </p>

      <h2>1) Non‑Custodial Services; On‑Chain Transactions</h2>
      <p>
        We provide a non‑custodial interface that enables you to interact with decentralized
        smart contracts and third‑party protocols (e.g., DEX aggregators/routers and bridges).
        We do not and cannot access your private keys; you control your wallet at all times.
        Transactions are executed on public blockchains at your direction and are generally
        irreversible once confirmed. You are solely responsible for safeguarding your wallet
        credentials, verifying contract addresses/route bytes, and reviewing transactions (including
        amounts, slippage, and fees) before signing.
      </p>

      <h2>2) No Advice; No Fiduciary Duties</h2>
      <p>
        The Services are for informational and technical interaction only. We do not provide
        investment, legal, accounting, or tax advice, and we are not your broker, dealer,
        or fiduciary. You must conduct your own due diligence and consult professional advisors.
      </p>

      <h2>3) Eligibility; Restricted Jurisdictions; Compliance</h2>
      <p>
        You must be at least {AGE_MINIMUM} years old and capable of entering a binding contract.
        You may not use the Services if you are located in, organized in, or a resident of any
        jurisdiction subject to comprehensive sanctions, or if you are on any sanctions or
        denied‑party list. You agree not to use the Services for unlawful purposes, including
        money laundering, terrorist financing, or sanctions evasion, and to comply with
        applicable laws and regulations (e.g., anti‑money‑laundering and sanctions rules).
      </p>

      <h2>4) Wallets; Fees; Taxes</h2>
      <p>
        You must use a compatible wallet to interact with the Services. Network fees (gas),
        third‑party protocol fees, and referral fees (if applicable) are your responsibility.
        We do not control third‑party fee parameters. You are solely responsible for any taxes
        or reporting obligations associated with your use of the Services and with any affiliate
        payouts you may receive.
      </p>

      <h2>5) Affiliate / Referral Program</h2>
      <p>
        We may operate an affiliate/referral program (“<strong>Program</strong>”) under which a
        referrer may earn a fee based on a portion of the swap tokens executed by referred users.
        Participation is a privilege, not a right, and is subject to these Terms and any posted
        Program rules. Without limiting our rights, we may: (a) change or discontinue the Program,
        fee rates, eligible tokens, or payout schedules at any time; (b) reject or reverse accruals
        for suspected fraud, abuse, wash trading, self‑referrals, or violation of these Terms;
        (c) set minimum payout thresholds and deny payouts below that threshold; and
        (d) withhold, freeze, or claw back fees where we reasonably suspect fraud or error.
      </p>
      <ul>
        <li><strong>Self‑referrals are prohibited.</strong></li>
        <li>
          Accruals and payouts depend on on‑chain events and may be delayed, reversed, unavailable,
          or technically impossible due to chain conditions, reorgs, failed indexers, or third‑party failures.
        </li>
        <li>
          Program fees do not constitute wages, employment, agency, or partnership. You are
          responsible for your taxes and compliance (including any required registrations or filings).
        </li>
      </ul>

      <h2>6) Assumption of Risk</h2>
      <p>
        Digital assets and smart contracts involve significant risks, including market volatility,
        loss of value, liquidity risk, impermanent loss, smart‑contract bugs or exploits, front‑running
        and MEV, chain reorganizations, network congestion or outages, bridge failures,
        oracle malfunctions, governance actions, and regulatory changes. You acknowledge that
        you may lose some or all of your assets and that transactions are final once confirmed.
      </p>

      <h2>7) Prohibited Conduct</h2>
      <ul>
        <li>Violating laws, regulations, sanctions, or third‑party rights.</li>
        <li>Interfering with, disrupting, or degrading the Services; introducing malware; rate‑limiting abuse.</li>
        <li>Attempting to exploit protocol or contract logic contrary to intended use or licenses.</li>
        <li>Impersonation, misrepresentation, or deceptive or fraudulent activity (including Program abuse).</li>
      </ul>

      <h2>8) Third‑Party Services and Open‑Source Components</h2>
      <p>
        The Services may reference or integrate third‑party content, protocols, or libraries.
        We do not control and are not responsible for third‑party services; your use is at your own
        risk and subject to their terms. Open‑source components are licensed under their respective
        licenses; you must comply with those licenses in addition to these Terms.
      </p>

      <h2>9) Beta Features; Modifications; Availability</h2>
      <p>
        We may release alpha/beta features that are experimental and provided “as is.” We may
        modify, suspend, or discontinue any feature or the Services at any time with or without notice,
        including for security, maintenance, or compliance reasons.
      </p>

      <h2>10) Disclaimers</h2>
      <p>
        THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW,
        WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, NON‑INFRINGEMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR
        USAGE OF TRADE.
      </p>

      <h2>11) Limitation of Liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE,
        DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF THE
        SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR
        ALL CLAIMS WILL NOT EXCEED THE GREATER OF (A) USD $100 OR (B) THE AMOUNT YOU PAID DIRECTLY
        TO US (IF ANY) FOR THE SERVICES IN THE 12 MONTHS PRECEDING THE CLAIM.
      </p>

      <h2>12) Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless {LEGAL_NAME}, our affiliates, and our
        and their respective officers, directors, employees, and agents from any claims, liabilities,
        damages, losses, and expenses (including reasonable attorneys’ fees) arising out of or related
        to your use of the Services or your violation of these Terms.
      </p>

      <h2>13) Dispute Resolution; Arbitration; Class‑Action Waiver</h2>
      <p>
        You and we agree to resolve any dispute arising out of or relating to these Terms or the Services
        through final and binding arbitration administered by {ARBITRATION_FORUM} under its rules,
        before a single arbitrator seated in {ARBITRATION_LOCATION}. You waive the right to a jury trial
        and to participate in a class, collective, or representative action. The U.S. Federal Arbitration Act
        governs the interpretation and enforcement of this arbitration agreement (if applicable).
        Nothing in this section prevents either party from seeking temporary or preliminary injunctive
        relief in a court of competent jurisdiction to protect its rights pending arbitration.
      </p>

      <h2>14) DMCA / Takedown</h2>
      <p>
        If you believe content available via the Services infringes your copyright, please send a notice
        to our designated agent at <a href={`mailto:${DMCA_AGENT_EMAIL}`}>{DMCA_AGENT_EMAIL}</a>&nbsp; 
        containing all information required by 17 U.S.C. §512(c)(3), including: (i) your physical or
        electronic signature; (ii) identification of the copyrighted work claimed to be infringed;
        (iii) identification of the material that is claimed to be infringing and information reasonably
        sufficient to permit us to locate the material; (iv) your contact information; (v) a statement
        of good‑faith belief; and (vi) a statement that the information is accurate and, under penalty
        of perjury, that you are authorized to act on behalf of the owner.
      </p>

      <h2>15) Governing Law; Venue</h2>
      <p>
        These Terms are governed by the laws of {GOVERNING_LAW}, without regard to conflicts of law rules.
        Subject to the arbitration clause, the exclusive jurisdiction and venue for any action shall be the
        state and federal courts located in {ARBITRATION_LOCATION}, and you consent to personal jurisdiction there.
      </p>

      <h2>16) Termination</h2>
      <p>
        We may suspend or terminate your access to the Services at any time with or without notice,
        including for any actual or suspected violation of these Terms, fraud, or abuse.
      </p>

      <h2>17) Miscellaneous</h2>
      <ul>
        <li><strong>Entire Agreement.</strong> These Terms constitute the entire agreement between you and us regarding the Services.</li>
        <li><strong>Severability.</strong> If any provision is unenforceable, the remaining provisions remain in effect.</li>
        <li><strong>Assignment.</strong> You may not assign or transfer your rights without our prior written consent; we may assign these Terms.</li>
        <li><strong>Waiver.</strong> Failure to enforce a provision is not a waiver.</li>
        <li><strong>Force Majeure.</strong> We are not liable for delays or failures due to events beyond our reasonable control.</li>
        <li><strong>Changes.</strong> We may update these Terms; the “Last updated” date reflects the effective date. Continued use after changes constitutes acceptance.</li>
      </ul>

      <h2>18) Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      </article>
    </main>
  );
}
