import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type SectionId = "mission" | "how-it-works" | "trust";

const sections: Record<
  SectionId,
  {
    label: string;
    title: string;
    description: string;
    points: string[];
  }
> = {
  mission: {
    label: "Our Mission",
    title: "Helping Everyday People Use PulseChain",
    description:
      "PulseChainRamp removes the guesswork from getting assets onto PulseChain. We focus on clear steps, plain language, and helpful guardrails so that anyone, even if they are new to crypto, can complete a bridge with confidence.",
    points: [
      "Written for real people – not developers – with screens designed for clarity and accessibility.",
      "One place to buy, bridge, and swap, so you always know what to do next.",
      "Responsive support links and educational tips right where you need them.",
    ],
  },
  "how-it-works": {
    label: "How It Works",
    title: "Three Steps To Get Started",
    description:
      "PulseChainRamp guides you from your first purchase through the final swap. Each step uses familiar, trusted services and keeps you informed on progress.",
    points: [
      "1. Buy ETH or a stablecoin using our on‑ramp partners that support your country and payment method.",
      "2. Bridge the funds to PulseChain with a single clear action. We monitor the transfer and keep you updated.",
      "3. Swap into the PulseChain assets you need using straightforward controls and current pricing.",
    ],
  },
  trust: {
    label: "Support & Trust",
    title: "Safe By Design",
    description:
      "We believe peace of mind matters. PulseChainRamp combines best practices and transparent communication so you never feel lost while moving value.",
    points: [
      "Real-time checks for network, balances, and approvals before you transact.",
      "Contact options and documentation linked in the footer on every page.",
      "Built with modern, audited tooling and continuously improved based on community feedback.",
    ],
  },
};

const About: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("mission");

  const sectionOrder = useMemo(
    () => ["mission", "how-it-works", "trust"] as SectionId[],
    []
  );

  const current = sections[activeSection];

  return (
    <div className="bg-bg-page text-text">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">About PulseChainRamp</h1>
          <Link
            to="/"
            className="touch-target inline-flex items-center justify-center rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:bg-primary-050/80 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back to Home
          </Link>
        </div>

        <nav
          aria-label="About sections"
          className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-bg-surface p-2 shadow-floating"
        >
          {sectionOrder.map((id) => {
            const { label } = sections[id];
            const isActive = id === activeSection;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-text-muted hover:bg-primary-050/70 hover:text-primary"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <section className="rounded-2xl border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
          <header className="space-y-3">
            <h2 className="text-2xl font-semibold">{current.title}</h2>
            <p className="text-base text-text-muted leading-relaxed">
              {current.description}
            </p>
          </header>

          <ul className="mt-6 space-y-3 text-base text-text">
            {current.points.map((point, index) => (
              <li
                key={index}
                className="rounded-lg border border-border bg-bg-raised px-4 py-3 leading-relaxed"
              >
                {point}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default About;
