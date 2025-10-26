import { useState } from "react";
import { Link } from "react-router-dom";
import ContactUsModal from "./ContactUsModal";

export default function AppFooter() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="mt-8 border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <nav className="w-full flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6">
            <Link
              to="/referrals"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4 whitespace-nowrap"
            >
              Affiliate<span className="hidden sm:inline"> Program</span>
            </Link>
            <Link
              to="/docs"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4 whitespace-nowrap"
            >
              Docs
            </Link>
            <button
              onClick={() => setShowContactModal(true)}
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4 whitespace-nowrap"
            >
              Contact Us
            </button>
            <Link
              to="/terms"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4 whitespace-nowrap"
            >
              Terms of Use
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4 whitespace-nowrap"
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
