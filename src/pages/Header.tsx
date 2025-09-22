import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import CustomConnectButton from "../components/CustomConnectButton";
import NetworkIndicator from "../components/NetworkIndicator";
import useWallet from "../hooks/useWallet";
import { toast } from "react-toastify";
import {
  useAppDispatch,
  useReferralCode,
  useReferralLoading,
  useReferralAddress,
  useReferralFeeBasisPoints,
  useReferralFeeBasisPointsLoading,
  useReferrerFeeBasisPoints,
} from "../store/hooks";
import {
  fetchReferralCode,
  fetchReferralAddress,
  fetchReferralFeeBasisPoints,
  fetchReferrerFeeBasisPoints,
  clearReferralCode,
  clearReferralAddress,
} from "../store/referralSlice";
import {
  extractAndSaveReferralCode,
  getStoredReferralCode,
  hasReferralCodeInUrl,
  isSelfReferral,
  formatFeeBasisPoints,
} from "../utils/referralUtils";

const Header = () => {
  const { account, connectWallet, disconnectWallet } = useWallet();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dispatch = useAppDispatch();
  const referralCodeData = useReferralCode();
  const referralLoading = useReferralLoading();
  const referralAddressData = useReferralAddress();
  const referralFeeBasisPoints = useReferralFeeBasisPoints();
  const referralFeeBasisPointsLoading = useReferralFeeBasisPointsLoading();
  const referrerFeeBasisPoints = useReferrerFeeBasisPoints();

  const isActive = (path: string) => {
    return (
      location.pathname === path ||
      (path === "/bridge" && location.pathname === "/")
    );
  };

  // Handle referral codes from URL and localStorage
  useEffect(() => {
    // Check if there's a referral code in the URL
    if (hasReferralCodeInUrl()) {
      const extractedCode = extractAndSaveReferralCode();
      if (extractedCode) {
        // Check if this is a new/different referral code
        const existingCode = getStoredReferralCode();
        const isNewCode = existingCode && existingCode !== extractedCode;

        // Fetch referral address data for the extracted code
        dispatch(fetchReferralAddress(extractedCode));
      }
    } else {
      // Check localStorage for existing referral code
      const storedCode = getStoredReferralCode();
      if (storedCode && !referralAddressData) {
        // Fetch referral address data for the stored code
        dispatch(fetchReferralAddress(storedCode));
      }
    }
  }, [dispatch, referralAddressData]);

  // Fetch referral code when account changes
  useEffect(() => {
    if (account) {
      dispatch(fetchReferralCode(account));
    } else {
      dispatch(clearReferralCode());
    }

    // Cleanup on unmount
    return () => {
      dispatch(clearReferralCode());
      // Don't clear referral address - keep it in localStorage forever
    };
  }, [account, dispatch]);

  // Log if self-referral is detected
  useEffect(() => {
    if (
      account &&
      referralAddressData &&
      isSelfReferral(account, referralAddressData.address)
    ) {
      console.log("Self-referral detected in header, hiding referral info");
    }
  }, [account, referralAddressData]);

  // Fetch referral fee basis points when we have a referral address
  useEffect(() => {
    if (referralAddressData && !referralFeeBasisPoints) {
      dispatch(fetchReferralFeeBasisPoints(referralAddressData.address));
    }
  }, [dispatch, referralAddressData, referralFeeBasisPoints]);

  useEffect(() => {
    if (referralAddressData && !referrerFeeBasisPoints) {
      dispatch(fetchReferrerFeeBasisPoints(referralAddressData.address));
    }
  }, [dispatch, referralAddressData?.address, referrerFeeBasisPoints]);

  const handleReferralCodeCopy = async () => {
    try {
      const referralCode = referralCodeData?.referralCode;
      if (referralCode) {
        const mainDomain = window.location.origin;
        const referralUrl = `${mainDomain}?code=${referralCode}`;

        await navigator.clipboard.writeText(referralUrl);
        toast.success("Referral link copied to clipboard");
      } else {
        toast.error("Referral code not available");
      }
    } catch (error) {
      console.error("Failed to copy referral code:", error);
      toast.error("Failed to copy referral link");
    }
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-16 sm:h-20 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section - Logo and Navigation */}
        <div className="flex items-center space-x-4 sm:space-x-8">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 rounded-2xl shadow-lg flex items-center justify-center group-hover:shadow-emerald-500/25 transition-all duration-300">
                <span className="text-white font-bold text-lg sm:text-xl">
                  P
                </span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            </motion.div>
            <div className="flex flex-col">
              <span className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
                PulseChain
              </span>
              <span className="text-xs text-slate-400 -mt-1 font-medium">
                Aggregator
              </span>
            </div>
          </Link>

          {/* Navigation Buttons - Hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-2">
            <Link to="/bridge">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-6 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  isActive("/bridge")
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg"
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">🌉</span>
                  <span>Bridge</span>
                </span>
                {isActive("/bridge") && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            </Link>
            <Link to="/swap">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-6 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  isActive("/swap")
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg"
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">💱</span>
                  <span>Swap</span>
                </span>
                {isActive("/swap") && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Right Section - Actions and Wallet */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Wallet Connection */}
          {account ? (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
                className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 px-4 sm:px-6 py-2.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/10 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                  <span className="text-emerald-400 font-semibold text-sm sm:text-base">
                    {account.slice(0, 4)}...{account.slice(-4)}
                  </span>
                  <span className="hidden sm:inline text-emerald-400/70 group-hover:text-emerald-400 transition-colors text-lg">
                    ↓
                  </span>
                </div>
              </motion.button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                  className="absolute right-0 top-full w-64 bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 z-50"
                >
                  <div className="p-3">
                    {/* Referral Code Section */}
                    <div className="mb-2">
                      <button
                        onClick={handleReferralCodeCopy}
                        disabled={
                          referralLoading || !referralCodeData?.referralCode
                        }
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-700/50 rounded-lg transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-white font-medium">
                              {referralLoading
                                ? "Loading..."
                                : "Copy Referral Code"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {referralCodeData?.referralCode
                                ? `Code: ${referralCodeData.referralCode}`
                                : referralLoading
                                ? "Fetching code..."
                                : "No code available"}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Referral Address Info - Show if user was referred (but not self-referral) */}
                    {referralAddressData &&
                      account &&
                      !isSelfReferral(account, referralAddressData.address) && (
                        <div className="mb-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-emerald-400 text-sm">🎯</span>
                            <div>
                              <p className="text-xs text-emerald-400 font-medium">
                                Referred by
                              </p>
                              <p className="text-xs text-slate-300 font-mono">
                                {referralAddressData.address.slice(0, 6)}...
                                {referralAddressData.address.slice(-4)}
                              </p>
                              <p className="text-xs text-slate-400">
                                Code: {referralAddressData.referralCode}
                              </p>
                              {referralFeeBasisPointsLoading ? (
                                <p className="text-xs text-slate-400">
                                  Loading fee...
                                </p>
                              ) : referrerFeeBasisPoints ? (
                                <p className="text-xs text-emerald-400 font-medium">
                                  Fee: {formatFeeBasisPoints(referrerFeeBasisPoints)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    
                    {/* Refer & Earn link */}
                    <Link
                      to="/referrals"
                      className="block px-3 py-2 rounded-md hover:bg-slate-700/60 text-emerald-300 font-medium"
                      // onClick={() => setWalletDropdownOpen(false)}
                    >
                      Refer &amp; Earn
                    </Link>

                    {/* Divider */}
                    <div className="my-2 h-px bg-slate-700/60" />

                    {/* Disconnect Button */}
                    <button
                      onClick={() => {
                        disconnectWallet();
                        // Don't clear referral address - keep it in localStorage forever
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-red-500/20 hover:border-red-500/30 border border-transparent rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm text-red-400 font-medium">
                            Disconnect
                          </p>
                          <p className="text-xs text-slate-400">
                            Sign out wallet
                          </p>
                        </div>
                      </div>
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
    </motion.div>
  );
};

export default Header;
