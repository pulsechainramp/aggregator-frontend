import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import overviewMd from "@docs/overview.md?raw";
import safetyAndTrustMd from "@docs/safety-and-trust.md?raw";
import walletSetupMd from "@docs/wallet-setup.md?raw";
import bridgingMd from "@docs/how-bridging-works.md?raw";
import feesMd from "@docs/fees-and-limits.md?raw";
import supportedMd from "@docs/supported-assets.md?raw";
import faqMd from "@docs/faq.md?raw";
import troubleshootingMd from "@docs/troubleshooting.md?raw";
import referralsMd from "@docs/referrals.md?raw";

type DocSlug =
  | "overview"
  | "safety-and-trust"
  | "wallet-setup"
  | "how-bridging-works"
  | "fees-and-limits"
  | "supported-assets"
  | "faq"
  | "troubleshooting"
  | "referrals";

const DOCS: { slug: DocSlug; title: string; content: string }[] = [
  { slug: "overview", title: "Overview", content: overviewMd },
  { slug: "wallet-setup", title: "Wallet Setup", content: walletSetupMd },
  { slug: "how-bridging-works", title: "How Bridging Works", content: bridgingMd },
  { slug: "fees-and-limits", title: "Fees & Limits", content: feesMd },
  { slug: "supported-assets", title: "Supported Assets", content: supportedMd },
  { slug: "safety-and-trust", title: "Safety & Trust", content: safetyAndTrustMd },
  { slug: "referrals", title: "Referrals", content: referralsMd },
  { slug: "faq", title: "FAQ", content: faqMd },
  { slug: "troubleshooting", title: "Troubleshooting", content: troubleshootingMd },
];

function useDocSlug(): DocSlug {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const slugParam = params.get("slug") as DocSlug | null;
    const valid = DOCS.some((doc) => doc.slug === slugParam);
    return valid && slugParam ? slugParam : "overview";
  }, [location.search]);
}

const Docs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useDocSlug();

  const activeDoc =
    DOCS.find((doc) => doc.slug === activeSlug) ?? DOCS.find((doc) => doc.slug === "overview") ?? DOCS[0];

  const handleSelect = (slug: DocSlug) => {
    if (slug === activeSlug) {
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set("slug", slug);

    navigate({
      pathname: location.pathname,
      search: params.toString(),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-text lg:flex-row">
      <aside className="w-full shrink-0 rounded-xl border border-border bg-bg-surface p-4 shadow-sm lg:w-64">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Documentation
        </h2>
        <nav className="mt-4 flex flex-col gap-2">
          {DOCS.map((doc) => {
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
        </nav>
      </aside>

      <section className="relative w-full overflow-hidden rounded-xl border border-border bg-bg-surface shadow-floating">
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-6 text-text">
          <ReactMarkdown
            components={{
              h1: (props) => (
                <h1 className="mb-6 mt-10 text-3xl font-bold text-text first:mt-0" {...props} />
              ),
              h2: (props) => (
                <h2 className="mb-4 mt-8 text-2xl font-semibold text-text first:mt-0" {...props} />
              ),
              h3: (props) => (
                <h3 className="mb-3 mt-6 text-xl font-semibold text-primary first:mt-0" {...props} />
              ),
              p: (props) => <p className="mb-4 leading-relaxed text-text-muted" {...props} />,
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
            {activeDoc?.content ?? ""}
          </ReactMarkdown>
        </div>
      </section>
    </div>
  );
};

export default Docs;
