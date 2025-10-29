import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import overviewMd from "@docs/overview.md?raw";
import betaTestingMd from "@docs/beta-testing.md?raw";
import safetyAndTrustMd from "@docs/safety-and-trust.md?raw";

type DocSlug = "overview" | "beta-testing" | "safety-and-trust";

type DocRecord = {
  slug: DocSlug;
  title: string;
  content: string;
};

const FALLBACK_TITLES: Record<DocSlug, string> = {
  overview: "Overview",
  "beta-testing": "Beta Testing",
  "safety-and-trust": "Safety & Trust",
};

const RAW_DOCS: Record<DocSlug, string> = {
  overview: overviewMd,
  "beta-testing": betaTestingMd,
  "safety-and-trust": safetyAndTrustMd,
};

const extractTitle = (markdown: string, fallback: string) => {
  const lines = markdown.split("\n");
  const heading = lines.find((line) => line.trim().startsWith("#"));
  if (!heading) {
    return fallback;
  }
  return heading.replace(/^#+\s*/, "").trim() || fallback;
};

const Docs = () => {
  const docs: DocRecord[] = useMemo(() => {
    return (Object.keys(RAW_DOCS) as DocSlug[]).map((slug) => {
      const content = RAW_DOCS[slug];
      return {
        slug,
        content,
        title: extractTitle(content, FALLBACK_TITLES[slug]),
      };
    });
  }, []);

  const [activeSlug, setActiveSlug] = useState<DocSlug>("overview");

  const activeDoc = docs.find((doc) => doc.slug === activeSlug) ?? docs[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-text lg:flex-row">
      <aside className="w-full shrink-0 rounded-xl border border-border bg-bg-surface p-4 shadow-sm lg:w-64">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Documentation
        </h2>
        <nav className="mt-4 flex flex-col gap-2">
          {docs.map((doc) => {
            const isActive = doc.slug === activeDoc?.slug;
            return (
              <button
                key={doc.slug}
                onClick={() => setActiveSlug(doc.slug)}
                className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  isActive
                    ? "border border-primary bg-primary-050 text-primary shadow-sm"
                    : "border border-transparent text-text-muted hover:border-primary hover:bg-primary-050/60 hover:text-primary"
                }`}
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
                <h1
                  className="mb-6 mt-10 text-3xl font-bold text-text first:mt-0"
                  {...props}
                />
              ),
              h2: (props) => (
                <h2
                  className="mb-4 mt-8 text-2xl font-semibold text-text first:mt-0"
                  {...props}
                />
              ),
              h3: (props) => (
                <h3
                  className="mb-3 mt-6 text-xl font-semibold text-primary first:mt-0"
                  {...props}
                />
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
                <ul
                  className="mb-4 list-disc space-y-2 pl-6 text-text-muted"
                  {...props}
                />
              ),
              ol: (props) => (
                <ol
                  className="mb-4 list-decimal space-y-2 pl-6 text-text-muted"
                  {...props}
                />
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
                  <table
                    className="min-w-full divide-y divide-border text-sm"
                    {...props}
                  />
                </div>
              ),
              th: (props) => (
                <th
                  className="bg-primary-050 px-4 py-2 text-left font-semibold text-text"
                  {...props}
                />
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
