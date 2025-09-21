import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="mt-8 border-t border-slate-800/60">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <nav className="w-full flex items-center justify-center">
          <Link
            to="/referrals"
            className="text-sm text-slate-400 hover:text-emerald-300 underline underline-offset-4"
          >
            Affiliate Program
          </Link>
        </nav>
      </div>
    </footer>
  );
}