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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row">
      <aside className="w-full shrink-0 rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 backdrop-blur-sm lg:w-64">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300/90">
          Documentation
        </h2>
        <nav className="mt-4 flex flex-col gap-2">
          {docs.map((doc) => {
            const isActive = doc.slug === activeDoc?.slug;
            return (
              <button
                key={doc.slug}
                onClick={() => setActiveSlug(doc.slug)}
                className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-white ring-1 ring-emerald-400/40"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                {doc.title}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="relative w-full overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-6 text-slate-200">
          <ReactMarkdown
            components={{
              h1: (props) => (
                <h1
                  className="mb-6 mt-10 text-3xl font-bold text-white first:mt-0"
                  {...props}
                />
              ),
              h2: (props) => (
                <h2
                  className="mb-4 mt-8 text-2xl font-semibold text-white first:mt-0"
                  {...props}
                />
              ),
              h3: (props) => (
                <h3
                  className="mb-3 mt-6 text-xl font-semibold text-emerald-300 first:mt-0"
                  {...props}
                />
              ),
              p: (props) => (
                <p className="mb-4 leading-relaxed text-slate-300" {...props} />
              ),
              a: (props) => (
                <a
                  className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                  {...props}
                />
              ),
              ul: (props) => (
                <ul
                  className="mb-4 list-disc space-y-2 pl-6 text-slate-300"
                  {...props}
                />
              ),
              ol: (props) => (
                <ol
                  className="mb-4 list-decimal space-y-2 pl-6 text-slate-300"
                  {...props}
                />
              ),
              li: (props) => <li className="leading-relaxed" {...props} />,
              blockquote: (props) => (
                <blockquote
                  className="my-6 border-l-4 border-emerald-400/60 bg-slate-800/60 px-4 py-3 text-slate-200 italic"
                  {...props}
                />
              ),
              code: ({ inline, children, ...props }) => {
                if (inline) {
                  return (
                    <code
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.85em] text-emerald-300"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-950/70 p-4 text-sm text-emerald-200">
                    <code {...props}>{children}</code>
                  </pre>
                );
              },
              hr: (props) => <hr className="my-8 border-slate-800/80" {...props} />,
              table: (props) => (
                <div className="mb-6 overflow-x-auto">
                  <table
                    className="min-w-full divide-y divide-slate-800/80 text-sm"
                    {...props}
                  />
                </div>
              ),
              th: (props) => (
                <th
                  className="bg-slate-900/60 px-4 py-2 text-left font-semibold text-white"
                  {...props}
                />
              ),
              td: (props) => <td className="px-4 py-2 text-slate-300" {...props} />,
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
