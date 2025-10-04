import { useState } from "react";
import { Link } from "react-router-dom";
import ContactUsModal from "./ContactUsModal";

export default function AppFooter() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="mt-8 border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <nav className="w-full flex items-center justify-center gap-6">
            <Link
              to="/referrals"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4"
            >
              Affiliate Program
            </Link>
            <button
              onClick={() => setShowContactModal(true)}
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4"
            >
              Contact Us
            </button>
            <Link
              to="/terms"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4"
            >
              Terms of Use
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4"
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