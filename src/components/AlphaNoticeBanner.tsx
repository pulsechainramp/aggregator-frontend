import React, { useState } from "react";

const STORAGE_KEY = "beta-banner-dismissed";

const AlphaNoticeBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return !window.localStorage.getItem(STORAGE_KEY);
  });

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full border-b border-warning/40 bg-warning/15 text-xs text-text sm:text-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
        <div className="flex flex-1 items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-warning/60 px-2 py-0.5 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-warning">
            Beta
          </span>
          <p className="flex-1 text-[0.72rem] font-medium text-text sm:text-xs">
            Beta testing: please report any issues and double-check swap details before confirming.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(STORAGE_KEY, "1");
            }
            setIsVisible(false);
          }}
          className="inline-flex h-7 items-center justify-center rounded-full border border-warning/40 px-3 text-[0.63rem] font-semibold uppercase tracking-wide text-warning transition hover:bg-warning hover:text-text-inverse focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default AlphaNoticeBanner;
