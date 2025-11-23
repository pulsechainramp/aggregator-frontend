import { useState } from "react";
import { Link } from "react-router-dom";
import ContactUsModal from "./ContactUsModal";
import { toast } from "react-toastify";

const DONATION_ADDRESS = "0x137e0A3205023f78535Ed303DAED89FCde8d87c2";

async function copyDonationAddress() {
  try {
    if ("clipboard" in navigator && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = DONATION_ADDRESS;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast.success("Donation address copied");
  } catch (_error) {
    toast.error("Could not copy donation address");
  }
}

export default function AppFooter() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="border-t border-border bg-bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6">
            <a
              href="https://github.com/pulsechainramp"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              GitHub
            </a>
            <button
              onClick={copyDonationAddress}
              type="button"
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              Donate
            </button>
            <Link
              to="/docs"
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              Docs
            </Link>
            <button
              onClick={() => setShowContactModal(true)}
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary underline underline-offset-4"
              type="button"
            >
              Contact Us
            </button>
            <Link
              to="/terms"
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              Terms of Use
            </Link>
            <Link
              to="/privacy"
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>

      <ContactUsModal 
        open={showContactModal} 
        onClose={() => setShowContactModal(false)} 
      />
    </>
  );
}
