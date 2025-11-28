import React, { useState } from "react";

type Props = {
  referralUrl: string;
};

const CustomDomainCollapsible = ({ referralUrl }: Props) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
    } catch {
      /* ignore copy failure */
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-bg-surface p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-base font-semibold text-text">Use your own .com (optional)</p>
          <p className="text-sm text-text-muted">Point a simple domain to your referral link in a few clicks.</p>
        </div>
        <span className="text-lg text-text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="space-y-4 text-sm text-text">
            <div>
              <p className="font-semibold text-text">Porkbun (recommended)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-text-muted">
                <li>
                  Buy a domain at{" "}
                  <a
                    href="https://porkbun.com/products/domains"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    porkbun.com
                  </a>
                  .
                </li>
                <li>
                  Open URL forwarding guide at{" "}
                  <a
                    href="https://kb.porkbun.com/article/39-how-to-set-up-url-forwarding"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    kb.porkbun.com/article/39-how-to-set-up-url-forwarding
                  </a>
                  .
                </li>
                <li>Paste your referral link as the destination and save.</li>
              </ol>
            </div>

            <div>
              <p className="font-semibold text-text">GoDaddy</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-text-muted">
                <li>
                  Go to{" "}
                  <a
                    href="https://www.godaddy.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    godaddy.com
                  </a>{" "}
                  and choose your domain.
                </li>
                <li>
                  Follow the forwarding steps at{" "}
                  <a
                    href="https://www.godaddy.com/help/forward-my-godaddy-domain-12123"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    GoDaddy help: Forward my domain
                  </a>
                  .
                </li>
                <li>Forward the domain to your referral link and save.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 text-sm text-text">
            <p className="font-semibold text-text">Test checklist</p>
            <ul className="list-disc space-y-1 pl-5 text-text-muted">
              <li>Open the domain in a private/incognito window.</li>
              <li>Make sure it loads your referral link (the URL should include your code).</li>
              <li>Share the domain only after it works.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDomainCollapsible;
