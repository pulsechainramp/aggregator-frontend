import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy aligned with GDPR/UK GDPR and California CCPA/CPRA.
// Replace all bracketed placeholders before deploying.
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_NAME = "PulseChainRamp.com";
const CONTACT_EMAIL = "PulseChainRamp@gmail.com";
const AGE_MINIMUM = 18;

export default function Privacy() {
  return (
    <main className="
        mx-auto max-w-3xl px-4 py-10
        text-slate-900 dark:text-slate-200
        leading-7 space-y-5
        [&_h1]:text-slate-50 [&_h1]:mb-6
        [&_h2]:text-slate-100 [&_h2]:mt-8 [&_h2]:mb-2
        [&_ul]:list-disc [&_ul]:pl-6
        [&_a]:underline [&_a]:text-emerald-300 hover:[&_a]:text-emerald-200
      ">
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> 04 October 2025</p>

      <p>
        This Privacy Policy explains how <strong>{LEGAL_NAME}</strong> (
        “we,” “us,” or “our”) collects, uses, discloses, and protects information related to visitors and users
        of our websites, interfaces, APIs, smart contracts, and related services (the “<strong>Services</strong>”).
        Where we determine the purposes and means of processing personal data, we act as a “controller.”
      </p>

      <h2>1) Information We Process</h2>
      <p>We may process the following categories of information:</p>
      <ul>
        <li><strong>Wallet &amp; On‑Chain Data:</strong> wallet/public addresses, transaction hashes, token balances or transfers, contract interactions, and referral codes or addresses used in connection with swaps/bridges. On‑chain data is public by design and may be permanently recorded by the relevant blockchain network.</li>
        <li><strong>Technical &amp; Usage Data:</strong> device/browser information, IP address, timestamps, pages viewed, and basic diagnostics generated when you access our Services.</li>
        <li><strong>Communications:</strong> email address and message content when you contact us (e.g., support, rights requests, DMCA).</li>
        <li><strong>Affiliate/Referral Data:</strong> referrer identifiers, accrual events, tokens/amounts accrued, payout addresses, and fraud‑prevention signals.</li>
      </ul>
      <p>
        We do <em>not</em> collect or store your private keys. Transactions you authorize are signed in your wallet and
        broadcast to the network. Some data (e.g., IP address or device data) may be collected automatically when you
        access our Services.
      </p>

      <h2>2) Sources of Personal Data</h2>
      <ul>
        <li><strong>Directly from you</strong> (e.g., when you contact support or configure settings).</li>
        <li><strong>Automatically</strong> (e.g., technical/usage logs and limited telemetry).</li>
        <li><strong>Public blockchains</strong> (e.g., on‑chain transactions and events).</li>
        <li><strong>Service providers</strong> that assist with infrastructure, analytics, security, or communications.</li>
      </ul>

      <h2>3) How We Use Personal Data</h2>
      <ul>
        <li>Provide, operate, secure, and improve the Services (including routing, indexers, telemetry, and fraud prevention).</li>
        <li>Facilitate affiliate/referral accruals and payouts and detect Program abuse (e.g., self‑referrals, wash trading, or other misuse).</li>
        <li>Comply with legal obligations and enforce our Terms (including responding to lawful requests and takedown notices).</li>
        <li>Communicate with you (e.g., service notices, support, or material changes to policies).</li>
      </ul>

      <h2>4) Legal Bases (EU/UK)</h2>
      <ul>
        <li><strong>Contract necessity</strong> (to provide the Services you request, including swap/bridge routing and referral accruals).</li>
        <li><strong>Legitimate interests</strong> (to secure our Services, prevent abuse, and improve performance, balanced against your rights).</li>
        <li><strong>Legal obligation</strong> (to comply with applicable laws, court orders, or enforceable requests).</li>
        <li><strong>Consent</strong> (where required by law, e.g., certain marketing communications).</li>
      </ul>

      <h2>5) “Selling” or “Sharing” (California)</h2>
      <p>
        We do not “sell” personal information and do not “share” personal information for cross‑context behavioral
        advertising as those terms are defined under California law. If this changes, we will update this Policy and
        provide required opt‑out mechanisms (including honoring Global Privacy Control signals).
      </p>

      <h2>6) Disclosure of Personal Data</h2>
      <p>We may disclose personal data to:</p>
      <ul>
        <li><strong>Service providers</strong> performing services on our behalf (e.g., infrastructure, security, analytics, support), bound by confidentiality and use restrictions.</li>
        <li><strong>Affiliates and business transferees</strong> (e.g., during a merger, acquisition, or asset sale).</li>
        <li><strong>Law enforcement, regulators, or parties to legal proceedings</strong> where required by law or necessary to protect rights, safety, or the integrity of the Services.</li>
        <li><strong>Public blockchains</strong>, where your transactions and related data are broadcast and permanently recorded by the network.</li>
      </ul>

      <h2>7) International Transfers</h2>
      <p>
        If we transfer personal data internationally, we rely on appropriate safeguards where required (e.g., Standard
        Contractual Clauses) and take steps designed to ensure an adequate level of protection in the destination country.
      </p>

      <h2>8) Data Retention</h2>
      <p>
        We retain personal data for as long as necessary to provide the Services, comply with legal obligations, resolve
        disputes, enforce agreements, and for legitimate business purposes. Blockchain records may be immutable and cannot
        generally be altered or deleted by us.
      </p>

      <h2>9) Security</h2>
      <p>
        We implement reasonable technical and organizational measures designed to protect personal data. However, no
        security program or method of transmission is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>10) Your Rights (EU/UK)</h2>
      <p>
        Subject to applicable law, you may have rights to access, rectify, erase, restrict, or object to processing of your
        personal data, and to data portability. You also have the right to lodge a complaint with a supervisory authority.
        To exercise rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If we rely on consent,
        you may withdraw consent at any time without affecting prior processing.
      </p>

      <h2>11) Your Rights (California)</h2>
      <p>
        Subject to exceptions, California residents may have rights to know/access, correct, delete, and portability; to
        limit use/disclosure of sensitive personal information; and to be free from retaliation for exercising rights.
        We honor user‑enabled Global Privacy Control (GPC) signals where applicable. To exercise rights, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>12) Children’s Privacy</h2>
      <p>
        Our Services are not directed to or intended for children. Do not use the Services if you are under {AGE_MINIMUM}.
        If we become aware that we have collected personal data from a child contrary to law, we will take steps to delete it.
      </p>

      <h2>13) Do Not Track</h2>
      <p>
        Some browsers offer “Do Not Track” signals. Our Services do not respond to DNT signals, but we honor Global Privacy
        Control (GPC) opt‑out signals where required by law.
      </p>

      <h2>14) Contact Representatives</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>15) Changes to this Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The “Last updated” date above reflects the effective date.
        Material changes will be posted on this page or otherwise communicated as required by law. Your continued use of
        the Services following an update constitutes acceptance of the revised Policy.
      </p>

      <h2>16) Requests Process (EU/UK/California)</h2>
      <p>
        To exercise your rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with sufficient information
        to identify you and your request. We may ask for additional information to verify your identity or authority (e.g.,
        proof of control of the relevant wallet address or from which an interaction occurred). If you use an authorized
        agent, we may require proof of authorization and independent verification. We will respond within the timeframe
        required by applicable law.
      </p>

      <h2>17) State‑Specific Disclosures (California)</h2>
      <p>
        For California residents, the categories of personal information we may collect and disclose for business purposes
        are described in Sections 2 and 7. We do not “sell” or “share” personal information as defined by California law.
        If our practices change, we will update this Policy and provide the required opt‑out mechanisms.
      </p>

      <h2>18) Definitions</h2>
      <ul>
        <li>
          <strong>“Personal data” / “Personal information”</strong> means information that identifies, relates to, describes,
          or could reasonably be linked with an identifiable person or household, subject to applicable law.
        </li>
        <li>
          <strong>“Processing”</strong> means any operation performed on personal data (e.g., collecting, storing,
          using, disclosing).
        </li>
        <li>
          <strong>“Service provider” / “Processor”</strong> means a party that processes personal data for us under a contract
          restricting use and disclosure as required by law.
        </li>
        <li>
          <strong>“Sell” / “Share”</strong> have the meanings provided by California law.
        </li>
      </ul>

      <h2>19) Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}
