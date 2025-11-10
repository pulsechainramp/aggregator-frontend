import { useEffect } from "react";
import { Link } from "react-router-dom";

const NEW_TO_CRYPTO_STEPS = [
  {
    title: "1. Wallet",
    body: "Install a self-custody wallet (like Rabby or MetaMask) and back up your recovery phrase.",
    href: "/wallet",
  },
  {
    title: "2. Onramp",
    body: "Pick a provider for your country and buy ETH, then withdraw it to your wallet.",
    href: "/onramp",
  },
  {
    title: "3. Bridge",
    body: "Send ETH from your wallet to PulseChain so it's ready for swaps.",
    href: "/bridge",
  },
  {
    title: "4. Swap",
    body: "Swap into the assets you need while keeping some PLS for fees.",
    href: "/swap",
  },
];

const Start = () => {
  const steps = NEW_TO_CRYPTO_STEPS;

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("hasSeenStart", "true");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <div className="bg-bg-page px-4 py-10 text-text">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="space-y-4 rounded-3xl border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Get started
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Get on PulseChain, the simple way.
          </h1>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.title}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold  tracking-wide text-primary">
                  {step.title}
                </p>
                  <p className="mt-1 text-sm text-text-muted">{step.body}</p>
              </div>
              <Link
                to={step.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-primary bg-primary px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {step.title.replace(/^[0-9.\s]+/, "")}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Start;
