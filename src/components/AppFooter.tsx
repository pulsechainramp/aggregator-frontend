import { useState } from "react";
import { Link } from "react-router-dom";
import ContactUsModal from "./ContactUsModal";

export default function AppFooter() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="border-t border-border bg-bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <span className="text-sm text-text-subtle">
            &copy; {new Date().getFullYear()} PulseChainRamp. All rights reserved.
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6">
            <a
              href="https://github.com/pulsechainramp"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              GitHub
            </a>
            <Link
              to="/docs"
              className="hidden text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              Documentation
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
