import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import React from "react";
import { useTheme } from "../theme/ThemeProvider";

const MobileThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-bg-surface text-text shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};

export default MobileThemeToggle;
