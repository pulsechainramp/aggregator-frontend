import React from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { path: "/", label: "Swap" },
  { path: "/bridge", label: "Bridge" },
  { path: "/activity", label: "Activity" },
  { path: "/start", label: "Start" },
] as const;

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="rounded-xl border border-border bg-bg-surface px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="text-lg font-semibold text-text">
          PulseBridge
        </Link>
        <div className="flex gap-2">
          {NAV_LINKS.map(({ path, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`touch-target inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary-050 text-primary shadow-sm"
                    : "border-transparent text-text-muted hover:border-primary hover:bg-primary-050/80 hover:text-primary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
