import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import useWallet from "../../hooks/useWallet";
import {
  useAppDispatch,
  useReferralCode,
  useReferralFees,
  useReferralLoading,
  useReferralError,
  useReferralClaiming,
  useReferralFeeBasisPoints,
  useReferralFeeBasisPointsLoading,
  useReferralState,
} from "../../store/hooks";
import {
  fetchReferralFees,
  claimReferralEarnings,
  ReferralFee,
  fetchReferralCode,
  fetchReferralFeeBasisPoints,
  fetchReferralCreationFeeInfo,
  checkReferralCreationFeePaid,
  createReferralCodeSecure,
  submitReferralCreationFeePayment,
  ensureSiweSessionAction,
  clearReferralFees,
} from "../../store/referralSlice";
import { getAvailableTokensFromChain } from "../../store/swapSlice";
import { toast } from "react-toastify";
import { TokenType } from "../../types/Swap";
import AddToWalletButton from "../../components/AddToWalletButton";
import CustomConnectButton from "../../components/CustomConnectButton";
import ReferralFeePopup from "../Swap/ReferralFeePopup";
import { formatFeeBasisPoints } from "../../utils/referralUtils";
import { BackendURL } from "../../const/swap";
import { formatEther } from "ethers";

const Referrals: React.FC = () => {
  const { account, isOnPulseChain } = useWallet();
  const dispatch = useAppDispatch();
  const referralCode = useReferralCode();
  const referralFees = useReferralFees();
  const loading = useReferralLoading();
  const error = useReferralError();
  const [tokens, setTokens] = useState<TokenType[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const claiming = useReferralClaiming();
  const [claimingToken, setClaimingToken] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [isFeePopupOpen, setIsFeePopupOpen] = useState(false);
  const referralFeeBasisPoints = useReferralFeeBasisPoints();
  const feeBasisPointsLoading = useReferralFeeBasisPointsLoading();
  const {
    creationFeeInfo,
    creationFeeLoading,
    hasPaidCreationFee,
    checkingCreationFee,
    payingCreationFee,
    authToken,
    siweLoading,
    authenticating,
    creatingReferralCode,
    paymentRequired,
  } = useReferralState();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (typeof document !== "undefined") {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    resetScroll();
    const raf = window.requestAnimationFrame(resetScroll);

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, []);

  useEffect(() => {
    dispatch(fetchReferralCreationFeeInfo());
  }, [dispatch]);

  // Reset fees and reload referral code whenever the active wallet changes
  useEffect(() => {
    dispatch(clearReferralFees());
    if (account) {
      dispatch(fetchReferralCode(account));
    }
  }, [account, dispatch]);

  useEffect(() => {
    if (!account || !creationFeeInfo?.fee) {
      return;
    }

    try {
      const feeValue = BigInt(creationFeeInfo.fee);
      if (feeValue > 0n) {
        dispatch(checkReferralCreationFeePaid(account));
      }
    } catch (feeError) {
      console.error("Failed to parse referral creation fee:", feeError);
    }
  }, [account, creationFeeInfo, dispatch]);

  // Calculate total earnings from Redux state
  const totalEarnings = useMemo(() => {
    return referralFees
      .reduce((sum: number, fee: any) => {
        return sum + parseFloat(fee.amount || "0");
      }, 0)
      .toString();
  }, [referralFees]);

  // Fetch tokens for metadata
  const fetchTokens = async () => {
    setTokensLoading(true);
    try {
      const pulsechainChain = {
        blockchainNetwork: "pulsechain",
        address: "0x0000000000000000000000000000000000000000",
        name: "PulseChain",
        symbol: "PLS",
        decimals: 18,
        image: "",
      } as TokenType;

      const tokensData = await dispatch(
        getAvailableTokensFromChain(pulsechainChain)
      ).unwrap();
      setTokens(tokensData);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      dispatch(fetchReferralFees(account));
      dispatch(fetchReferralFeeBasisPoints(account));
      fetchTokens();
    }
  }, [account, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any errors when component unmounts
      if (error) {
        // You can dispatch a clear error action here if you have one
      }
    };
  }, [error]);

  const handlePayCreationFee = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isPulseChainNetwork) {
      toast.error("Switch to PulseChain to pay the referral creation fee");
      return;
    }

    try {
      await dispatch(submitReferralCreationFeePayment({ account })).unwrap();
      toast.success("Referral creation fee paid");
    } catch (err: any) {
      const message =
        typeof err === "string"
          ? err
          : err?.message || "Failed to pay referral creation fee";
      toast.error(message);
    }
  };

  const handleGenerateReferralCode = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      let feeInfo = creationFeeInfo;
      if (!feeInfo) {
        feeInfo = await dispatch(fetchReferralCreationFeeInfo()).unwrap();
      }

      if (feeInfo && BigInt(feeInfo.fee) > 0n && !hasPaidCreationFee) {
        toast.error("Please pay the referral creation fee before continuing");
        return;
      }

      let token = authToken;

      if (!token) {
        token = await dispatch(ensureSiweSessionAction(account)).unwrap();
      }

      if (!token) {
        throw new Error("Authentication failed");
      }

      await dispatch(
        createReferralCodeSecure({ address: account.toLowerCase(), token })
      ).unwrap();

      toast.success("Referral code created");
      dispatch(fetchReferralCode(account));
    } catch (err: any) {
      if (err?.type === "PAYMENT_REQUIRED") {
        if (hasPaidCreationFee) {
          toast.info(
            "Fee payment is still confirming. Please wait for one confirmation, then try again."
          );
        } else {
          try {
            const feeDisplay = formatEther(BigInt(err.fee));
            toast.error(`Pay ${feeDisplay} PLS to unlock referrals`);
          } catch (parseError) {
            toast.error("Referral creation fee payment required");
          }
        }
        if (account) {
          dispatch(checkReferralCreationFeePaid(account));
        }
        return;
      }

      const message =
        typeof err === "string"
          ? err
          : err?.message || "Failed to create referral code";
      toast.error(message);
    }
  };
  const handleClaim = async (fee: ReferralFee) => {
    setClaimingToken(fee.token);
    try {
      if (!account) {
        toast.error("Please connect your wallet");
        return;
      }

      const result = await dispatch(
        claimReferralEarnings({
          tokens: [fee.token],
          account,
        })
      ).unwrap();

      toast.success(
        `Successfully claimed ${
          fee.amount
        } tokens! Transaction: ${result.transactionHash.slice(0, 10)}...`
      );

      if (account) {
        dispatch(fetchReferralFees(account));
      }
    } catch (error: any) {
      console.error("Error claiming tokens:", error);
    } finally {
      setClaimingToken((current) => (current === fee.token ? null : current));
    }
  };

  const handleBulkClaim = async () => {
    setClaimingAll(true);
    setClaimingToken(null);
    try {
      if (!account) {
        toast.error("Please connect your wallet");
        return;
      }

      if (referralFees.length === 0) {
        toast.error("No tokens to claim");
        return;
      }

      const tokens = referralFees.map((fee) => fee.token);

      const result = await dispatch(
        claimReferralEarnings({
          tokens,
          account,
        })
      ).unwrap();

      toast.success(
        `Successfully claimed all tokens! Transaction: ${result.transactionHash.slice(
          0,
          10
        )}...`
      );

      if (account) {
        dispatch(fetchReferralFees(account));
      }
    } catch (error: any) {
      console.error("Error bulk claiming tokens:", error);
    } finally {
      setClaimingAll(false);
    }
  };

  useEffect(() => {
    if (!claiming) {
      setClaimingToken(null);
      setClaimingAll(false);
    }
  }, [claiming]);

  const handleRefresh = () => {
    if (account) {
      dispatch(fetchReferralFees(account));
      fetchTokens();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get token metadata from address
  const getTokenMetadata = (tokenAddress: string) => {
    const token = tokens.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token || null;
  };

  const referralBaseUrl = useMemo(() => {
    const normalize = (value?: string) => {
      if (!value) return "";
      return value.endsWith("/") ? value.slice(0, -1) : value;
    };

    const backend = normalize(BackendURL);

    if (typeof window === "undefined") {
      return backend;
    }

    const origin = window.location.origin;
    const isLocal =
      origin.includes("localhost") || origin.includes("127.0.0.1");

    if (isLocal) {
      return backend || origin;
    }

    return backend || origin;
  }, []);

  const creationFee = useMemo(() => {
    if (!creationFeeInfo?.fee) {
      return null;
    }

    try {
      const value = BigInt(creationFeeInfo.fee);
      return {
        value,
        formatted: formatEther(value),
      };
    } catch (err) {
      console.error("Failed to parse creation fee:", err);
      return null;
    }
  }, [creationFeeInfo]);

  const requiresPayment = creationFee ? creationFee.value > 0n : false;
  const paymentRequiredDisplay = useMemo(() => {
    if (!paymentRequired?.fee) {
      return null;
    }

    try {
      return formatEther(BigInt(paymentRequired.fee));
    } catch (err) {
      console.error("Failed to parse payment required fee:", err);
      return paymentRequired.fee;
    }
  }, [paymentRequired]);


  const filteredReferralFees = referralFees.filter(
    (fee) => Number(fee.amount) > 0
  );

  const isPulseChainNetwork = isOnPulseChain();

  if (!account) {
    return (
      <div className="bg-bg-page px-4 py-16 text-text sm:py-24">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-bg-surface px-6 py-10 text-center shadow-sm sm:px-10">
          <h2 className="text-2xl font-bold text-text">Connect Wallet</h2>
          <p className="mt-3 text-base text-text-muted">
            Please connect your wallet to view your referral dashboard and earnings.
          </p>
          <CustomConnectButton variant="cta" className="mt-6" />
        </div>
      </div>
    );
  }

  const referralLink = referralCode?.referralCode
    ? `${referralBaseUrl}?code=${referralCode.referralCode}`
    : "";

  const copyReferralLink = async () => {
    try {
      if (!referralLink) return;
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard");
    } catch (e) {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="min-h-screen bg-bg-page text-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-primary mb-4">
            Referral Dashboard
          </h1>
          <p className="text-text-muted text-lg">
            Track your referral earnings and claim your rewards
          </p>
        </motion.div>

        {/* Your referral link */}
        <section className="mb-6 rounded-2xl border border-border bg-bg-surface p-4">
          <h2 className="text-text font-semibold mb-2">Your referral link</h2>

          {!account ? (
            <p className="text-text-muted text-sm">
              Connect your wallet to get your referral link.
            </p>
          ) : referralCode ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md bg-bg-surface border border-border px-3 py-2 text-text text-sm"
                  readOnly
                  value={referralLink || "Generating..."}
                />
                <button
                  onClick={copyReferralLink}
                  disabled={!referralLink}
                  className="px-4 py-2 rounded-md bg-primary hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-text-muted">
                {feeBasisPointsLoading
                  ? "Fetching your referral fee..."
                  : referralFeeBasisPoints
                  ? `Current referral fee: ${formatFeeBasisPoints(
                      referralFeeBasisPoints
                    )}`
                  : "Referral fee not set yet"}
              </p>
              <div className="pt-1">
                <button
                  onClick={() => setIsFeePopupOpen(true)}
                  className="touch-target inline-flex items-center justify-center rounded-lg border border-success bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Update referral fee
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                {creationFeeLoading
                  ? "Checking one-time creation fee..."
                  : creationFee
                  ? requiresPayment
                    ? `A one-time fee of ${creationFee.formatted} PLS is required to generate your referral code.`
                    : "Sign in to generate your referral code."
                  : "Unable to determine the referral creation fee. Please try again."}
              </p>
              {paymentRequired && (
                <div className="rounded-lg border border-border bg-bg-raised px-4 py-3 text-sm text-text">
                  Wallet payment required. Pay {paymentRequiredDisplay ?? paymentRequired.fee} PLS to {paymentRequired.contractAddress} and try again.
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                {requiresPayment && (
                  <button
                    onClick={handlePayCreationFee}
                    disabled={
                      payingCreationFee ||
                      checkingCreationFee ||
                      hasPaidCreationFee === true ||
                      !isPulseChainNetwork
                    }
                    className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
                  >
                    {!isPulseChainNetwork
                      ? "Switch to PulseChain"
                      : payingCreationFee
                      ? "Paying..."
                      : hasPaidCreationFee === true
                      ? "Paid"
                      : `Pay ${creationFee?.formatted ?? ""} PLS`}
                  </button>
                )}
                <button
                  onClick={handleGenerateReferralCode}
                  disabled={
                    creatingReferralCode ||
                    siweLoading ||
                    authenticating ||
                    (requiresPayment && hasPaidCreationFee !== true)
                  }
                  className="rounded-lg border border-success bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/80 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
                >
                  {creatingReferralCode || siweLoading || authenticating
                    ? "Processing..."
                    : requiresPayment
                    ? hasPaidCreationFee
                      ? "Authenticate & Create"
                      : "Pay fee to continue"
                    : "Authenticate & Create"}
                </button>
              </div>
              {!isPulseChainNetwork && requiresPayment && (
                <p className="text-xs text-danger">
                  Switch to PulseChain to pay the creation fee and unlock referral codes.
                </p>
              )}
              {payingCreationFee && (
                <p className="text-xs text-text-muted">
                  Waiting for your wallet transaction to confirm...
                </p>
              )}
              {checkingCreationFee && (
                <p className="text-xs text-text-muted">
                  Confirming fee payment on-chain...
                </p>
              )}
              {requiresPayment && hasPaidCreationFee && (
                <p className="text-xs text-success">
                  Payment detected. You can sign to generate your referral code.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Referral Fees List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-bg-surface backdrop-blur-md border border-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">Claimable Tokens</h2>
            <div className="flex items-center space-x-3">
              {filteredReferralFees.length > 0 && (
                <button
                  onClick={handleBulkClaim}
                  disabled={
                    claimingAll ||
                    claimingToken !== null ||
                    claiming ||
                    loading ||
                    tokensLoading
                  }
                  className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
                >
                  {claimingAll
                    ? "Claiming All..."
                    : `Claim All (${filteredReferralFees.length})`}
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={loading || tokensLoading}
                className="px-4 py-2 rounded-lg border border-success bg-success text-white font-medium transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
              >
                {loading || tokensLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-text-muted mt-4">Loading referral fees...</p>
            </div>
          ) : tokensLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-text-muted mt-4">Loading token metadata...</p>
            </div>
          ) : filteredReferralFees.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🎯</span>
              <p className="text-text-muted text-lg">No referral fees found</p>
              <p className="text-text-muted text-sm mt-2">
                Start referring friends to earn rewards!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-text-muted font-medium">
                      Token
                    </th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferralFees.map((fee) => {
                    const tokenMetadata = getTokenMetadata(fee.token);
                    const isCurrentTokenClaiming = claimingToken === fee.token;
                    const anotherClaimInFlight =
                      claimingAll ||
                      (claimingToken !== null && claimingToken !== fee.token) ||
                      (claiming && claimingToken === null && !claimingAll);
                    const disableClaimButton =
                      isCurrentTokenClaiming || anotherClaimInFlight;
                    const tokenChainId =
                      tokenMetadata?.blockchainNetwork?.toLowerCase() === "ethereum"
                        ? 1
                        : 369;

                    return (
                      <motion.tr
                        key={fee.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-b border-border transition-colors hover:bg-primary-050/40"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-raised text-xs font-semibold uppercase text-primary">
                              {tokenMetadata?.image ? (
                                <img
                                  src={tokenMetadata.image}
                                  alt={tokenMetadata.symbol}
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.src =
                                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxMEI5NjEiLz4KPC9zdmc+Cg==";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-primary-050 text-primary">
                                  {(tokenMetadata?.symbol || fee.token.slice(2, 6)).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              {tokenMetadata ? (
                                <>
                                  <p className="text-text font-medium">{tokenMetadata.symbol}</p>
                                  <p className="text-sm text-text-muted">{tokenMetadata.name}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-mono text-text font-medium">
                                    {fee.token.slice(0, 6)}...{fee.token.slice(-4)}
                                  </p>
                                  <p className="text-sm text-text-muted">Token Address</p>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-lg font-bold text-success">
                            {fee.amount}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-text-muted">
                          {formatDate(fee.createdAt)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {tokenMetadata && (
                              <AddToWalletButton
                                token={{
                                  address: tokenMetadata.address,
                                  symbol: tokenMetadata.symbol,
                                  decimals: tokenMetadata.decimals,
                                  chainId: tokenChainId,
                                }}
                                variant="outline"
                                size="sm"
                              />
                            )}
                            <button
                              onClick={() => handleClaim(fee)}
                              disabled={disableClaimButton}
                              className="rounded-lg border border-success bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/80 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
                            >
                              {isCurrentTokenClaiming ? "Claiming..." : "Claim"}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <ReferralFeePopup
          isOpen={isFeePopupOpen}
          onClose={() => setIsFeePopupOpen(false)}
        />
      </div>
    </div>
  );
};

export default Referrals;











