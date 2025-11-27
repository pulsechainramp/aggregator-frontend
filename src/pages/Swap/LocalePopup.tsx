import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNumberFormat } from "../../context/NumberFormatContext";
import { getLocaleForCountry } from "../../data/countryLocales";

interface LocalePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type LocaleOption = {
  label: string;
  value: string | null;
  hint?: string;
};

const LocalePopup: React.FC<LocalePopupProps> = ({ isOpen, onClose }) => {
  const {
    locale,
    country,
    localeOverride,
    setLocaleOverride,
    clearLocaleOverride,
  } = useNumberFormat();

  const [selectedDropdown, setSelectedDropdown] = useState<string>("");

  const autoLocale = useMemo(() => {
    const fallback = "Auto (browser / GeoIP)";
    if (!country) return fallback;
    const derived = getLocaleForCountry(country);
    return `${fallback} — ${derived}`;
  }, [country]);

  const options: LocaleOption[] = [
    { label: autoLocale, value: null },
    { label: "English (United States)", value: "en-US" },
    { label: "Deutsch (Deutschland)", value: "de-DE" },
    { label: "Português (Brasil)", value: "pt-BR" },
    { label: "Español (México)", value: "es-MX" },
    { label: "Français (France)", value: "fr-FR" },
  ];

  const moreLocaleOptions: { label: string; value: string }[] = [
    { label: "English (United Kingdom)", value: "en-GB" },
    { label: "English (Canada)", value: "en-CA" },
    { label: "Deutsch (Schweiz)", value: "de-CH" },
    { label: "Italiano (Italia)", value: "it-IT" },
    { label: "Nederlands (Nederland)", value: "nl-NL" },
    { label: "Svenska (Sverige)", value: "sv-SE" },
    { label: "Polski (Polska)", value: "pl-PL" },
    { label: "한국어 (대한민국)", value: "ko-KR" },
    { label: "日本語 (日本)", value: "ja-JP" },
    { label: "中文 (香港)", value: "zh-HK" },
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedDropdown(localeOverride ?? "");
    }
  }, [isOpen, localeOverride]);

  const handleSelect = (option: LocaleOption) => {
    if (option.value === null) {
      clearLocaleOverride();
    } else {
      setLocaleOverride(option.value);
    }
    onClose();
  };

  const handleDropdownApply = () => {
    if (!selectedDropdown) return;
    setLocaleOverride(selectedDropdown);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-96 max-w-[90vw] rounded-lg border border-border bg-bg-surface p-6 shadow-floating"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text">Language & Number Format</h2>
                <p className="text-sm text-text-muted">
                  Current: {locale} {localeOverride ? "(manual)" : "(auto)"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-text-muted transition-colors hover:text-primary"
                aria-label="Close locale selector"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-2">
              {options.map((option) => {
                const isActive =
                  (option.value === null && !localeOverride) ||
                  (option.value !== null && option.value === localeOverride);
                return (
                  <button
                    key={option.label}
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-start justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary-050/60 text-primary"
                        : "border-border bg-bg-page text-text hover:border-primary hover:bg-primary-050/40"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      {option.hint && (
                        <span className="text-xs text-text-muted">{option.hint}</span>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-sm font-semibold text-primary">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-muted">
                More locales
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedDropdown}
                  onChange={(e) => setSelectedDropdown(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                >
                  <option value="">Select a locale</option>
                  {moreLocaleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDropdownApply}
                  disabled={!selectedDropdown}
                  className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-text-muted">
                We use this only for formatting. It doesn’t change network, currency, or quotes.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocalePopup;
