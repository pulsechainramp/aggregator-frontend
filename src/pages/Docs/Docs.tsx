import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import overviewMd from "@docs/overview.md?raw";
import walletSetupMd from "@docs/wallet-setup.md?raw";
import bridgingMd from "@docs/how-bridging-works.md?raw";
import swapGuideMd from "@docs/swap-guide.md?raw";
import safetyMd from "@docs/safety-and-trust.md?raw";
import feesMd from "@docs/fees-and-limits.md?raw";
import supportedMd from "@docs/supported-assets.md?raw";
import referralsMd from "@docs/referrals.md?raw";
import faqMd from "@docs/faq.md?raw";
import troubleshootingMd from "@docs/troubleshooting.md?raw";
import networksMd from "@docs/networks-and-rpc.md?raw";
import allowancesMd from "@docs/allowances.md?raw";
import quotesMd from "@docs/quotes-and-slippage.md?raw";
import changelogMd from "@docs/changelog.md?raw";

type DocSlug =
  | "overview"
  | "wallet-setup"
  | "how-bridging-works"
  | "swap-guide"
  | "safety-and-trust"
  | "fees-and-limits"
  | "supported-assets"
  | "referrals"
  | "faq"
  | "troubleshooting"
  | "networks-and-rpc"
  | "allowances"
  | "quotes-and-slippage"
  | "changelog";

type DocTrack = "Basics" | "Using PulseChainRamp" | "Fast Help" | "Advanced";

type DocDefinition = {
  slug: DocSlug;
  title: string;
  content: string;
  track: DocTrack;
  cta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const DOCS: DocDefinition[] = [
  {
    slug: "overview",
    title: "Overview",
    content: overviewMd,
    track: "Basics",
    cta: { label: "Go to Start", href: "/start" },
  },
  {
    slug: "wallet-setup",
    title: "Wallet Setup",
    content: walletSetupMd,
    track: "Basics",
    cta: { label: "Go to Onramp", href: "/onramp" },
  },
  {
    slug: "how-bridging-works",
    title: "How Bridging Works",
    content: bridgingMd,
    track: "Basics",
    cta: { label: "Go to Bridge", href: "/bridge" },
    secondaryCta: { label: "Go to Wallet", href: "/wallet" },
  },
  {
    slug: "swap-guide",
    title: "Swap Guide",
    content: swapGuideMd,
    track: "Basics",
    cta: { label: "Go to Swap", href: "/swap" },
  },
  {
    slug: "safety-and-trust",
    title: "Safety & Trust",
    content: safetyMd,
    track: "Basics",
    cta: { label: "Back to Start", href: "/start" },
  },
  {
    slug: "fees-and-limits",
    title: "Fees & Limits",
    content: feesMd,
    track: "Using PulseChainRamp",
    cta: { label: "Plan a Bridge", href: "/bridge" },
  },
  {
    slug: "supported-assets",
    title: "Supported Assets",
    content: supportedMd,
    track: "Using PulseChainRamp",
    cta: { label: "Review Tokens", href: "/bridge" },
  },
  {
    slug: "referrals",
    title: "Referrals",
    content: referralsMd,
    track: "Using PulseChainRamp",
    cta: { label: "Open Referral Dashboard", href: "/referrals" },
  },
  {
    slug: "faq",
    title: "FAQ",
    content: faqMd,
    track: "Fast Help",
    cta: { label: "Jump to Bridge", href: "/bridge" },
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    content: troubleshootingMd,
    track: "Fast Help",
    cta: { label: "Open Wallet Tools", href: "/wallet" },
  },
  {
    slug: "networks-and-rpc",
    title: "Networks & RPC",
    content: networksMd,
    track: "Advanced",
    cta: { label: "Add PulseChain", href: "/wallet" },
  },
  {
    slug: "allowances",
    title: "Allowances & Approvals",
    content: allowancesMd,
    track: "Advanced",
    cta: { label: "Retry Swap", href: "/swap" },
  },
  {
    slug: "quotes-and-slippage",
    title: "Quotes & Slippage",
    content: quotesMd,
    track: "Advanced",
    cta: { label: "Open Swap", href: "/swap" },
  },
  //{
  //  slug: "changelog",
  //  title: "Release Notes",
  //  content: changelogMd,
  //  track: "Advanced",
  //  cta: { label: "Go to Start", href: "/start" },
  //},
];

const TRACK_ORDER: { track: DocTrack; label: string }[] = [
  { track: "Basics", label: "Basics" },
  { track: "Using PulseChainRamp", label: "Using PulseChainRamp" },
  { track: "Fast Help", label: "Fast Help" },
  { track: "Advanced", label: "Advanced" },
];

const useDocSlug = (): DocSlug => {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const slugParam = params.get("slug") as DocSlug | null;
    const valid = DOCS.some((doc) => doc.slug === slugParam);
    return valid && slugParam ? slugParam : "overview";
  }, [location.search]);
};

const SafetyReminder = () => (
  <div className="mt-6 rounded-xl border border-border bg-primary-050 px-4 py-3 text-sm text-primary">
    <strong className="font-semibold">Safety reminder:</strong> Don't bridge from an exchange; withdraw to
    your wallet first, then bridge here.
  </div>
);

const Docs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useDocSlug();
  const docs = useMemo(() => DOCS, []);

  const groupedDocs = useMemo(
    () =>
      TRACK_ORDER.map(({ track, label }) => ({
        track,
        label,
        docs: docs.filter((doc) => doc.track === track),
      })).filter((group) => group.docs.length > 0),
    [docs]
  );

  const activeDoc =
    docs.find((doc) => doc.slug === activeSlug) ?? docs.find((doc) => doc.slug === "overview") ?? docs[0];

  const handleSelect = (slug: DocSlug) => {
    if (slug === activeSlug) {
      return;
    }
    const params = new URLSearchParams(location.search);
    params.set("slug", slug);
    navigate({ pathname: location.pathname, search: params.toString() });
  };

  const showSafetyReminder = activeDoc.slug === "how-bridging-works";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-10 text-text sm:flex-row sm:overflow-x-auto">
      <div className="w-full sm:hidden">
        <label htmlFor="docPicker" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-subtle">
          Browse topics
        </label>
        <div className="relative">
          <select
            id="docPicker"
            value={activeDoc.slug}
            onChange={(e) => handleSelect(e.target.value as DocSlug)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {groupedDocs.map((group) => (
              <optgroup key={group.track} label={group.label}>
                {group.docs.map((doc) => (
                  <option key={doc.slug} value={doc.slug}>
                    {doc.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <aside className="sticky top-0 z-10 hidden w-64 flex-none rounded-xl border border-border bg-bg-surface p-4 shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto sm:block">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Docs</h2>
        <nav className="mt-4 flex flex-col gap-4">
          {groupedDocs.map((group) => (
            <div key={group.track}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                {group.label}
              </p>
              <div className="flex flex-col gap-2">
                {group.docs.map((doc) => {
                  const isActive = doc.slug === activeDoc.slug;
                  return (
                    <button
                      key={doc.slug}
                      onClick={() => handleSelect(doc.slug)}
                      className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                        isActive
                          ? "border border-primary bg-primary-050 text-primary shadow-sm"
                          : "border border-transparent text-text-muted hover:border-primary hover:bg-primary-050/60 hover:text-primary"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {doc.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="relative flex-1 overflow-hidden rounded-xl border border-border bg-bg-surface shadow-floating min-w-[300px]">
        <div className="px-6 py-8 text-text">
          <div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (props) => (
                  <h1 className="mb-6 text-3xl font-bold text-text" {...props} />
                ),
                h2: (props) => (
                  <h2 className="mb-4 mt-8 text-2xl font-semibold text-text first:mt-0" {...props} />
                ),
                h3: (props) => (
                  <h3 className="mb-3 mt-6 text-xl font-semibold text-primary first:mt-0" {...props} />
                ),
                p: (props) => (
                  <p className="mb-4 leading-relaxed text-text-muted" {...props} />
                ),
                a: (props) => (
                  <a
                    className="font-semibold text-primary underline underline-offset-4 hover:text-primary-600"
                    {...props}
                  />
                ),
                ul: (props) => (
                  <ul className="mb-4 list-disc space-y-2 pl-6 text-text-muted" {...props} />
                ),
                ol: (props) => (
                  <ol className="mb-4 list-decimal space-y-2 pl-6 text-text-muted" {...props} />
                ),
                li: (props) => <li className="leading-relaxed text-text-muted" {...props} />,
                blockquote: (props) => (
                  <blockquote
                    className="my-6 border-l-4 border-primary bg-primary-050 px-4 py-3 text-text italic"
                    {...props}
                  />
                ),
                code: ({ inline, children, ...props }) => {
                  if (inline) {
                    return (
                      <code
                        className="rounded bg-primary-050 px-1.5 py-0.5 text-[0.85em] text-primary"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="mb-4 overflow-x-auto rounded-lg border border-border bg-bg-raised p-4 text-sm text-text">
                      <code {...props}>{children}</code>
                    </pre>
                  );
                },
                hr: (props) => <hr className="my-8 border-border" {...props} />,
                table: (props) => (
                  <div className="mb-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm" {...props} />
                  </div>
                ),
                th: (props) => (
                  <th className="bg-primary-050 px-4 py-2 text-left font-semibold text-text" {...props} />
                ),
                td: (props) => <td className="px-4 py-2 text-text-muted" {...props} />,
              }}
            >
              {activeDoc.content}
            </ReactMarkdown>
          </div>

          {showSafetyReminder && <SafetyReminder />}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={activeDoc.cta.href}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {activeDoc.cta.label}
            </Link>
            {activeDoc.secondaryCta && (
              <Link
                to={activeDoc.secondaryCta.href}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {activeDoc.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Docs;
