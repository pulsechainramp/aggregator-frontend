import { motion } from "framer-motion";
import React, { useEffect, useState, useRef } from "react";
import { AffiliateRouterAddress, ZeroAddress } from "../../const/swap";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  loadPulsexTokens,
  getQuote,
  getTokenPrice,
  setFromAmount,
  setFromToken,
  setQuote,
  setToToken,
  approveTokenAction,
  executeSwapAction,
  checkTokenAllowance,
  getTokenBalance,
  getNativeBalance,
  setFromTokenBalance,
  setToTokenBalance,
  setNativeBalance,
  refreshBalancesAfterSwap,
  clearApprovalState,
  selectDefaultPulsexTokens,
  selectCoreFavoriteTokens,
  selectAllPulsexTokens,
} from "../../store/swapSlice";
import TokenPopup from "./TokenPopup";
import QuotePanel from "./QuotePanel";
import SlippagePopup from "./SlippagePopup";
import { SwapHeader, SwapCard, ApprovalStatus, SwapButton } from "./components";
import { ethers } from "ethers";
import * as toastify from "react-toastify";
import useWallet from "../../hooks/useWallet";
import {
  fetchReferralPromo,
  fetchPromoConstants,
} from "../../store/referralSlice";
import SwapPreviewModal from "./components/SwapPreviewModal";
import {
  validateQuoteIntegrity,
  QuoteValidationResult,
} from "../../utils/quoteValidation";
import { QuoteType, TokenType } from "../../types/Swap";
import { PulseChainConfig } from "../../config/chainConfig";
import { useQuoteSummary } from "../../hooks/useQuoteSummary";

const { toast } = toastify;
const QUOTE_REFRESH_INTERVAL_MS = 10_000;
const INITIAL_QUOTE_DELAY_MS = 2_000;

type PendingSwap = {
  quote: QuoteType;
  value: string;
  fromToken: TokenType;
  toToken: TokenType;
  account: string;
  validation: QuoteValidationResult;
};

const Swap: React.FC = () => {
  const dispatch = useAppDispatch();
  const { account, wallet, currentChainId } = useWallet();

  const [isTokenPopupOpen, setIsTokenPopupOpen] = useState(false);
  const [isSlippagePopupOpen, setIsSlippagePopupOpen] = useState(false);
  const [selectType, setSelectType] = useState<"from" | "to" | null>(null);
  const [searchToken, setSearchToken] = useState<string>("");
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<PendingSwap | null>(null);

  const {
    fromToken,
    toToken,
    quote,
    fromAmount,
    slippage,
    isApproving,
    isApproved,
    fromTokenBalance,
    toTokenBalance,
    nativeBalance,
    isPulseXLoading,
    isPiteamsLoading,
    showBetterRouterMessage,
    areTokensLoading,
    availableTokens,
  } = useAppSelector((state) => state.swap);
  const defaultTokens = useAppSelector(selectDefaultPulsexTokens);
  const coreFavoriteTokens = useAppSelector(selectCoreFavoriteTokens);
  const allTokens = useAppSelector(selectAllPulsexTokens);
  const { tailBps, maxPromoBps } = useAppSelector((state) => state.referral);

  const shouldBlockQuotes =
    Boolean(wallet) &&
    currentChainId !== null &&
    currentChainId !== PulseChainConfig.chainId;

  const quoteSummary = useQuoteSummary();
  const outputAmount = quoteSummary.netToTokenAmount;

  const openPreview = (swapRequest: PendingSwap) => {
    setPendingSwap(swapRequest);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setPendingSwap(null);
    setIsPreviewOpen(false);
  };

  const truncateToDecimals = (value: string, decimals: number) => {
    if (!value || !value.includes('.')) return value;
    const [integer, fraction] = value.split('.');
    if (fraction.length > decimals) {
      return `${integer}.${fraction.slice(0, decimals)}`;
    }
    return value;
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = () => {
    if (!fromToken || !fromAmount) return false;

    try {
      const safeFromAmount = truncateToDecimals(fromAmount, fromToken.decimals);
      const requiredAmountWei = ethers.parseUnits(safeFromAmount, fromToken.decimals);

      let currentBalanceWei: bigint;

      if (fromToken.address === ZeroAddress) {
        // Native balance is always 18 decimals
        const safeBalance = truncateToDecimals(nativeBalance, 18);
        currentBalanceWei = ethers.parseUnits(safeBalance, 18);
      } else {
        // Token balance might have excessive decimals if switching tokens
        const safeBalance = truncateToDecimals(fromTokenBalance, fromToken.decimals);
        currentBalanceWei = ethers.parseUnits(safeBalance, fromToken.decimals);
      }

      return currentBalanceWei >= requiredAmountWei;
    } catch (error) {
      console.error("Error checking balance:", error);
      return false;
    }
  };

  const handleExchangeTokenPlace = () => {
    if (fromToken && toToken) {
      dispatch(setFromToken({ ...toToken }));
      dispatch(setToToken({ ...fromToken }));
    }
  };

  const handleSwap = async () => {
    if (!fromToken || !toToken || !quote?.calldata) return;

    try {
      if (!account) {
        toast.error("No account found");
        return;
      }

      const safeFromAmount = truncateToDecimals(fromAmount, fromToken.decimals);

      // Check balance before proceeding
      if (!hasSufficientBalance()) {
        toast.error("Insufficient balance");
        return;
      }

      // Check if token is native (PLS) or needs approval
      if (fromToken.address !== ZeroAddress && !isApproved) {
        // Non-native token - handle approval
        toast.info("Approving token...");
        await dispatch(
          approveTokenAction({
            tokenAddress: fromToken.address,
            amount: safeFromAmount,
            decimals: fromToken.decimals,
            account: account || "",
            chainId: fromToken.chainId ?? PulseChainConfig.chainId,
          })
        )
          .unwrap()
          .then(() => {
            toast.success("Token approved successfully!");
            dispatch(
              checkTokenAllowance({
                tokenAddress: fromToken.address,
                amount: safeFromAmount,
                decimals: fromToken.decimals,
                userAddress: account || "",
                chainId: fromToken.chainId ?? PulseChainConfig.chainId,
              })
            );
          });
      } else {
        const value =
          fromToken.address === ZeroAddress
            ? ethers
              .parseUnits(safeFromAmount.toString(), fromToken.decimals)
              .toString()
            : "0";

        try {
          const validation = validateQuoteIntegrity(quote, {
            fromToken,
            toToken,
            fromAmount,
            slippage,
          });

          openPreview({
            quote,
            value,
            fromToken,
            toToken,
            account: account || "",
            validation,
          });
        } catch (validationError) {
          console.error("Quote validation failed before swap:", validationError);
          toast.error(
            validationError instanceof Error
              ? validationError.message
              : "Quote validation failed"
          );
        }
      }
    } catch (error) {
      console.error("Swap error:", error);
      toast.error("Transaction failed. Please try again.");
    }
  };

  const executePendingSwap = async () => {
    if (!pendingSwap) {
      return;
    }

    const { quote: pendingQuote, value, fromToken: pendingFromToken, toToken: pendingToToken, account: swapAccount } =
      pendingSwap;

    try {
      const validation = validateQuoteIntegrity(pendingQuote, {
        fromToken: pendingFromToken,
        toToken: pendingToToken,
        fromAmount,
        slippage,
      });
      setPendingSwap({ ...pendingSwap, validation });
      setIsPreviewOpen(false);
      toast.info("Executing swap...");

      await dispatch(
        executeSwapAction({
          quote: pendingQuote,
          value,
          account: swapAccount,
          fromToken: pendingFromToken,
        })
      ).unwrap();

      toast.success("Swap executed successfully!");

      if (swapAccount) {
        setIsRefreshingBalances(true);
        // Refresh immediately, then again shortly after to catch indexing lag
        dispatch(
          refreshBalancesAfterSwap({
            fromToken: pendingFromToken,
            toToken: pendingToToken,
            account: swapAccount,
          })
        )
          .catch(() => {
            handleBalanceRefreshError();
          })
          .finally(() => {
            setTimeout(() => {
              dispatch(
                refreshBalancesAfterSwap({
                  fromToken: pendingFromToken,
                  toToken: pendingToToken,
                  account: swapAccount,
                })
              ).catch(() => {
                handleBalanceRefreshError();
              });
            }, 1200);
          });
      }
    } catch (error) {
      console.error("Swap error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Transaction failed. Please try again."
      );
    } finally {
      setPendingSwap(null);
    }
  };

  useEffect(() => {
    if (!tailBps || !maxPromoBps) {
      dispatch(fetchPromoConstants());
    }
  }, [dispatch, tailBps, maxPromoBps]);

  useEffect(() => {
    if (account) {
      dispatch(fetchReferralPromo(account));
    }
  }, [dispatch, account]);

  useEffect(() => {
    if (!availableTokens.length) {
      dispatch(loadPulsexTokens());
    }
  }, [dispatch, availableTokens.length]);

  // Default swap tokens on PulseChain: WETH -> PLS
  useEffect(() => {
    if (availableTokens && availableTokens.length > 0) {
      // only set once
      if (!fromToken) {
        // Prefer symbol 'WETH', otherwise anything that begins with 'WETH' (e.g., 'WETH from Ethereum')
        const weth =
          availableTokens.find(t => t.symbol === "WETH") ||
          availableTokens.find(t => /^WETH/i.test(t.symbol));
        if (weth) {
          dispatch(setFromToken({ ...weth }));
        }
      }

      if (!toToken) {
        // Prefer PLS; fall back to native ZeroAddress if needed
        const pls =
          availableTokens.find(t => t.symbol === "PLS") ||
          availableTokens.find(t => t.address === ZeroAddress);
        if (pls) {
          dispatch(setToToken({ ...pls }));
        }
      }
    }
  }, [availableTokens, fromToken, toToken, dispatch]);

  // Get native balance when account changes
  useEffect(() => {
    if (account) {
      dispatch(getNativeBalance(account));
    } else {
      dispatch(setNativeBalance("0"));
    }
  }, [dispatch, account]);

  // Get token balances when tokens change
  useEffect(() => {
    if (fromToken?.address && account) {
      dispatch(
        getTokenBalance({
          tokenAddress: fromToken.address,
          userAddress: account,
          decimals: fromToken.decimals,
        })
      ).then((result) => {
        if (result.payload) {
          dispatch(setFromTokenBalance(result.payload as string));
        }
      });
    } else {
      dispatch(setFromTokenBalance("0"));
    }
  }, [dispatch, fromToken?.address, fromToken?.decimals, account]);

  useEffect(() => {
    if (toToken?.address && account) {
      dispatch(
        getTokenBalance({
          tokenAddress: toToken.address,
          userAddress: account,
          decimals: toToken.decimals,
        })
      ).then((result) => {
        if (result.payload) {
          dispatch(setToTokenBalance(result.payload as string));
        }
      });
    } else {
      dispatch(setToTokenBalance("0"));
    }
  }, [dispatch, toToken?.address, toToken?.decimals, account]);

  // Get token prices
  useEffect(() => {
    const isPulseChainToken =
      fromToken?.blockchainNetwork?.toLowerCase() === "pulsechain" ||
      fromToken?.chainId === PulseChainConfig.chainId;

    if (fromToken?.address && isPulseChainToken) {
      dispatch(
        getTokenPrice({
          address: fromToken.address,
          blockchainNetwork: fromToken.blockchainNetwork,
          chainId: fromToken.chainId,
          type: "from",
        })
      );
      dispatch(setQuote(null));
    }
  }, [dispatch, fromToken?.address, fromToken?.blockchainNetwork, fromToken?.chainId]);

  useEffect(() => {
    const isPulseChainToken =
      toToken?.blockchainNetwork?.toLowerCase() === "pulsechain" ||
      toToken?.chainId === PulseChainConfig.chainId;

    if (toToken?.address && isPulseChainToken) {
      dispatch(
        getTokenPrice({
          address: toToken.address,
          blockchainNetwork: toToken.blockchainNetwork,
          chainId: toToken.chainId,
          type: "to",
        })
      );
      dispatch(setQuote(null));
    }
  }, [dispatch, toToken?.address, toToken?.blockchainNetwork, toToken?.chainId]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const clearQuoteTimers = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const tokensOnPulsechain =
      fromToken?.blockchainNetwork === "pulsechain" &&
      toToken?.blockchainNetwork === "pulsechain";

    if (!tokensOnPulsechain || shouldBlockQuotes) {
      clearQuoteTimers();
      dispatch(setQuote(null));
      return;
    }

    if (fromToken?.address && toToken?.address && fromAmount) {
      dispatch(setQuote(null));
      clearQuoteTimers();

      const requestQuote = () => {
        dispatch(
          getQuote({
            tokenInAddress:
              fromToken.address.toLowerCase() === ZeroAddress
                ? "PLS"
                : fromToken.address,
            tokenOutAddress:
              toToken.address.toLowerCase() === ZeroAddress
                ? "PLS"
                : toToken.address,
            amount: fromAmount,
            allowedSlippage: slippage,
            fromDecimal: fromToken.decimals,
            account,
          })
        );
      };

      timeoutRef.current = setTimeout(() => {
        requestQuote();
        intervalRef.current = setInterval(requestQuote, QUOTE_REFRESH_INTERVAL_MS);
      }, INITIAL_QUOTE_DELAY_MS);
    } else {
      clearQuoteTimers();
      dispatch(setQuote(null));
    }

    return () => {
      clearQuoteTimers();
    };
  }, [
    dispatch,
    fromToken ? fromToken.address : undefined,
    toToken ? toToken.address : undefined,
    fromAmount,
    fromToken ? fromToken.decimals : undefined,
    slippage,
    fromToken ? fromToken.blockchainNetwork : undefined,
    toToken ? toToken.blockchainNetwork : undefined,
    account,
    shouldBlockQuotes,
  ]);

  useEffect(() => {
    if (currentChainId && currentChainId !== PulseChainConfig.chainId) {
      dispatch(clearApprovalState());
      return;
    }

    if (!fromToken?.address || !fromAmount || !fromToken?.decimals || !account) {
      return;
    }

    dispatch(
      checkTokenAllowance({
        tokenAddress: fromToken.address,
        amount: fromAmount,
        decimals: fromToken.decimals,
        userAddress: account,
        chainId: fromToken.chainId ?? PulseChainConfig.chainId,
      })
    );
  }, [
    dispatch,
    fromToken?.address,
    fromAmount,
    fromToken?.decimals,
    account,
    currentChainId,
  ]);

  useEffect(() => {
    if (isRefreshingBalances) {
      setIsRefreshingBalances(false);
    }
  }, [fromTokenBalance, toTokenBalance, nativeBalance, isRefreshingBalances]);

  const handleBalanceRefreshError = () => {
    toast.error("Failed to refresh balances. Please try again.");
    setIsRefreshingBalances(false);
  };

  const refreshBalances = () => {
    if (account && fromToken && toToken) {
      setIsRefreshingBalances(true);
      dispatch(
        refreshBalancesAfterSwap({
          fromToken,
          toToken,
          account,
        })
      ).catch(() => {
        handleBalanceRefreshError();
      });
    }
  };

  const previewData =
    pendingSwap && pendingSwap.validation
      ? {
        router: AffiliateRouterAddress,
        functionSignature: "executeSwap(bytes,address)",
        tokenInSymbol: pendingSwap.fromToken.symbol,
        tokenOutSymbol: pendingSwap.toToken.symbol,
        amountIn: ethers.formatUnits(
          pendingSwap.validation.decodedRoute.amountIn,
          pendingSwap.fromToken.decimals
        ),
        minAmountOut: ethers.formatUnits(
          pendingSwap.validation.decodedRoute.minAmountOut,
          pendingSwap.toToken.decimals
        ),
        deadline: pendingSwap.validation.decodedRoute.deadline,
        calldataHash: pendingSwap.quote.integrity.payload.calldataHash,
      }
      : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-start bg-bg-page px-4 pt-5 pb-8 text-text sm:px-6"
    >
      <motion.div className="mt-6 flex w-full max-w-4xl flex-col gap-6">
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-bg-surface p-4 shadow-floating sm:p-6">
          <SwapHeader
            slippage={slippage}
            onSlippageClick={() => setIsSlippagePopupOpen(true)}
            onRefreshClick={refreshBalances}
            isRefreshing={isRefreshingBalances}
          />

          <SwapCard
            fromToken={fromToken}
            toToken={toToken}
            fromAmount={fromAmount}
            outputAmount={outputAmount}
            onFromTokenSelect={() => {
              setIsTokenPopupOpen(true);
              setSelectType("from");
            }}
            onToTokenSelect={() => {
              setIsTokenPopupOpen(true);
              setSelectType("to");
            }}
            onFromAmountChange={(value) => dispatch(setFromAmount(value))}
            onTokenSwap={handleExchangeTokenPlace}
            isLoadingQuote={
              !quote && fromToken && toToken && fromAmount ? true : false
            }
            fromTokenBalance={fromTokenBalance}
            toTokenBalance={toTokenBalance}
            nativeBalance={nativeBalance}
          />

          {quote && fromToken && toToken && fromAmount && <QuotePanel />}

          {showBetterRouterMessage && (
            <div className="rounded-lg border border-primary bg-primary-050/60 p-3">
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>
                  For a better rate, please wait a moment...
                </span>
              </div>
            </div>
          )}

          {shouldBlockQuotes && (
            <div className="rounded-lg border border-warning bg-warning-050/60 p-3">
              <div className="flex items-center justify-center gap-2 text-sm text-warning">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Switch your wallet network to PulseChain to refresh quotes.</span>
              </div>
            </div>
          )}

          <ApprovalStatus
            fromToken={fromToken}
            fromAmount={fromAmount}
            isApproved={isApproved}
            isApproving={isApproving}
          />

          <SwapButton
            fromToken={fromToken}
            toToken={toToken}
            fromAmount={fromAmount}
            outputAmount={outputAmount}
            quote={quote}
            onSwap={handleSwap}
            hasSufficientBalance={hasSufficientBalance()}
          />
        </div>
      </motion.div>

      <TokenPopup
        isOpen={isTokenPopupOpen}
        onClose={() => setIsTokenPopupOpen(false)}
        selectType={selectType}
        searchToken={searchToken}
        setSearchToken={setSearchToken}
        tokens={defaultTokens}
        allTokens={allTokens}
        coreTokens={coreFavoriteTokens}
        isLoading={areTokensLoading}
      />

      <SlippagePopup
        isOpen={isSlippagePopupOpen}
        onClose={() => setIsSlippagePopupOpen(false)}
      />

      <SwapPreviewModal
        isOpen={isPreviewOpen && Boolean(previewData)}
        data={previewData}
        onCancel={closePreview}
        onConfirm={executePendingSwap}
      />
    </motion.div>
  );
};

export default Swap;
