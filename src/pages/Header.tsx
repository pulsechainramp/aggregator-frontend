import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import CustomConnectButton from "../components/CustomConnectButton";
import NetworkIndicator from "../components/NetworkIndicator";
import useWallet from "../hooks/useWallet";
import { toast } from "react-toastify";
import {
  useAppDispatch,
  useReferralAddress,
  useReferralCode,
  useReferralFeeBasisPoints,
  useReferralLoading,
  useReferrerFeeBasisPoints,
} from "../store/hooks";
import {
  clearReferralCode,
  fetchReferralAddress,
  fetchReferralCode,
  fetchReferralFeeBasisPoints,
  fetchReferrerFeeBasisPoints,
} from "../store/referralSlice";
import {
  extractAndSaveReferralCode,
  getStoredReferralCode,
  hasReferralCodeInUrl,
} from "../utils/referralUtils";
import { useTheme } from "../theme/ThemeProvider";

const NAV_LINKS = [
  { path: "/onramp", label: "Onramp" },
  { path: "/bridge", label: "Bridge" },
  { path: "/swap", label: "Swap" },
  //{ path: "/activity", label: "Activity" },
  { path: "/docs", label: "About" },
  { path: "/referrals", label: "Referrals" },
];

const MOBILE_LINKS = NAV_LINKS.slice(0, 3);

const Header = () => {
  const { account, disconnectWallet } = useWallet();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const referralCodeData = useReferralCode();
  const referralLoading = useReferralLoading();
  const referralAddressData = useReferralAddress();
  const referralFeeBasisPoints = useReferralFeeBasisPoints();
  const referrerFeeBasisPoints = useReferrerFeeBasisPoints();
  const { theme, toggleTheme } = useTheme();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const navLinks = useMemo(() => NAV_LINKS, []);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/bridge" && location.pathname === "/");

  const lastFetchedReferralCode = useRef<string | null>(null);

  useEffect(() => {
    let nextCode: string | null = null;

    if (hasReferralCodeInUrl()) {
      nextCode = extractAndSaveReferralCode();
    } else {
      nextCode = getStoredReferralCode();
    }

    if (nextCode && lastFetchedReferralCode.current !== nextCode) {
      lastFetchedReferralCode.current = nextCode;
      dispatch(fetchReferralAddress(nextCode));
    }

    if (!nextCode) {
      lastFetchedReferralCode.current = null;
    }
  }, [dispatch, location.search]);

  useEffect(() => {
    if (account) {
      dispatch(fetchReferralCode(account));
    } else {
      dispatch(clearReferralCode());
      lastFetchedReferralCode.current = null;
    }

    return () => {
      dispatch(clearReferralCode());
      lastFetchedReferralCode.current = null;
    };
  }, [account, dispatch]);

  useEffect(() => {
    if (
      referralAddressData &&
      !referralFeeBasisPoints
    ) {
      dispatch(fetchReferralFeeBasisPoints(referralAddressData.address));
    }
  }, [dispatch, referralAddressData, referralFeeBasisPoints]);

  useEffect(() => {
    if (referralAddressData && !referrerFeeBasisPoints) {
      dispatch(fetchReferrerFeeBasisPoints(referralAddressData.address));
    }
  }, [dispatch, referralAddressData, referrerFeeBasisPoints]);

  useEffect(() => {
    if (!showDropdown) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showDropdown]);

  const handleReferralCodeCopy = async () => {
    try {
      const referralCode = referralCodeData?.referralCode;
      if (!referralCode) {
        toast.error("Referral code not available");
        return;
      }

      const referralUrl = `${window.location.origin}?code=${referralCode}`;
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copied");
    } catch (error) {
      console.error("Failed to copy referral code:", error);
      toast.error("Could not copy referral link");
    }
  };

  const themeLabel = theme === "dark" ? "Dark" : "Light";

  return (
    <Fragment>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        className="sticky top-0 z-50 border-b border-border bg-bg-surface/95 backdrop-blur-sm shadow-sm"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="hidden items-center gap-2 text-left logo:flex logo:gap-3 sm:gap-3">
              <motion.img
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                src="/logo.png"
                alt="PulseChainRamp logo"
                className="h-10 w-auto logo:h-12 sm:h-14"
              />
              <span className="text-lg font-semibold text-text sm:text-2xl">
                PulseChain<span className="text-primary">Ramp</span>
              </span>
            </Link>
            <nav
              className="hidden nav:flex items-center gap-1"
              aria-label="Primary navigation"
            >
              {navLinks.map(({ path, label }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`relative flex min-h-[44px] items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary-050 text-primary shadow-sm"
                        : "border-transparent text-text-muted hover:border-primary hover:bg-primary-050/80 hover:text-primary"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-1 items-center gap-3 sm:flex-none">
            <Link to="/" className="flex items-center gap-2 text-left logo:hidden">
              <span className="text-base font-semibold text-text">
                PulseChain<span className="text-primary">Ramp</span>
              </span>
            </Link>
            <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none sm:gap-4">
              <NetworkIndicator className="hidden network:flex" />
              <button
                type="button"
                onClick={toggleTheme}
                className="hidden theme:inline-flex touch-target items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                <span>Theme</span>
                <span className="font-semibold">{themeLabel}</span>
              </button>
              {account ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown((prev) => !prev)}
                    className="touch-target inline-flex items-center gap-3 rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus shadow-sm"
                    aria-haspopup="menu"
                    aria-expanded={showDropdown}
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-success"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-base tracking-tight">
                      {account.slice(0, 4)}...{account.slice(-4)}
                    </span>
                  </button>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-bg-surface shadow-md"
                      role="menu"
                    >
                      <div className="space-y-4 p-4">
                        <button
                          onClick={() => {
                            toggleTheme();
                            setShowDropdown(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-primary hover:bg-primary-050/60"
                          role="menuitem"
                        >
                          <span>Theme</span>
                          <span className="text-xs font-medium text-text-muted">
                            {theme === "dark" ? "Dark <-> Light" : "Light <-> Dark"}
                          </span>
                        </button>

                        <button
                          onClick={handleReferralCodeCopy}
                          disabled={
                            referralLoading || !referralCodeData?.referralCode
                          }
                          className="flex w-full flex-col rounded-lg border border-border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary-050/60 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="text-sm font-semibold text-text">
                            Referral link
                          </span>
                          <span className="text-xs text-text-muted">
                            {referralLoading
                              ? "Loading referral code..."
                              : referralCodeData?.referralCode
                              ? `Code: ${referralCodeData.referralCode}`
                              : "No referral code available"}
                          </span>
                        </button>

                        <Link
                          to="/referrals"
                          className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-primary hover:bg-primary-050/60"
                          role="menuitem"
                          onClick={() => setShowDropdown(false)}
                        >
                          Refer &amp; Earn
                          <span className="text-xs font-medium text-primary">
                            Open
                          </span>
                        </Link>

                        <button
                          onClick={() => {
                            disconnectWallet();
                            setShowDropdown(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm font-semibold text-danger transition-colors hover:border-danger hover:bg-danger/10"
                          role="menuitem"
                        >
                          <span>Disconnect</span>
                          <span className="text-xs font-medium text-text-muted">
                            Sign out wallet
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <CustomConnectButton />
              )}
            </div>
          </div>

        </div>
      </motion.header>

      <nav
        className="nav:hidden border-b border-border bg-bg-surface"
        aria-label="Primary navigation mobile"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-3 gap-2 py-2">
            {MOBILE_LINKS.map(({ path, label }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`rounded-lg px-3 py-2 text-center text-base font-semibold transition-colors ${
                    active
                      ? "border border-primary bg-primary-050 text-primary shadow-sm"
                      : "border border-transparent bg-bg-surface text-text-muted hover:border-primary hover:bg-primary-050/80 hover:text-primary"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </Fragment>
  );
};

export default Header;
