import { motion } from "framer-motion";
import React, { useEffect, useState, useRef } from "react";
import { AffiliateRouterAddress, ZeroAddress } from "../../const/swap";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  getAllChains,
  getAvailableTokensFromChain,
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

const { toast } = toastify;

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
  const { account } = useWallet();

  const [isTokenPopupOpen, setIsTokenPopupOpen] = useState(false);
  const [isSlippagePopupOpen, setIsSlippagePopupOpen] = useState(false);
  const [chain, setChain] = useState<TokenType | null>(null);
  const [selectType, setSelectType] = useState<"from" | "to" | null>(null);
  const [searchChain, setSearchChain] = useState<string>("");
  const [searchToken, setSearchToken] = useState<string>("");
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<PendingSwap | null>(null);

  const {
    allChains,
    fromToken,
    toToken,
    quote,
    fromAmount,
    slippage,
    availableTokens,
    isApproving,
    isApproved,
    fromTokenBalance,
    toTokenBalance,
    nativeBalance,
    isPulseXLoading,
    isPiteamsLoading,
    showBetterRouterMessage,
  } = useAppSelector((state) => state.swap);
  const { tailBps, maxPromoBps } = useAppSelector((state) => state.referral);

  const outputAmount =
    quote?.outputAmount && toToken?.decimals
      ? Number(ethers.formatUnits(quote.outputAmount, toToken.decimals))
      : 0;

  const openPreview = (swapRequest: PendingSwap) => {
    setPendingSwap(swapRequest);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setPendingSwap(null);
    setIsPreviewOpen(false);
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = () => {
    if (!fromToken || !fromAmount) return false;

    try {
      const requiredAmountWei = ethers.parseUnits(fromAmount, fromToken.decimals);
      
      const currentBalanceWei = fromToken.address === ZeroAddress
        ? ethers.parseUnits(nativeBalance, 18) // Convert native balance to Wei
        : ethers.parseUnits(fromTokenBalance, fromToken.decimals); // Convert token balance to Wei

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
            amount: fromAmount,
            decimals: fromToken.decimals,
            account: account || "",
          })
        )
          .unwrap()
          .then(() => {
            toast.success("Token approved successfully!");
            dispatch(
              checkTokenAllowance({
                tokenAddress: fromToken.address,
                amount: fromAmount,
                decimals: fromToken.decimals,
                userAddress: account || "",
              })
            );
          });
      } else {
        const value =
          fromToken.address === ZeroAddress
            ? ethers
                .parseUnits(fromAmount.toString(), fromToken.decimals)
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
        }, 2000);
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

  // Initialize chains
  useEffect(() => {
    dispatch(getAllChains());
  }, [dispatch]);

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
    if (chain) {
      dispatch(getAvailableTokensFromChain(chain));
    }
  }, [dispatch, chain]);

  useEffect(() => {
    if (allChains && allChains.length > 0 && !chain) {
      const pulseChain = allChains.find(
        (chain) => chain.blockchainNetwork === "pulsechain"
      );
      if (pulseChain) {
        setChain(pulseChain);
      } else {
        setChain({ ...allChains[0] });
      }
    }
  }, [allChains, dispatch, chain]);

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
    if (fromToken?.address && fromToken?.blockchainNetwork) {
      dispatch(
        getTokenPrice({
          address: fromToken.address,
          blockchainNetwork: fromToken.blockchainNetwork,
          type: "from",
        })
      );
      dispatch(setQuote(null));
    }
  }, [dispatch, fromToken?.address, fromToken?.blockchainNetwork]);

  useEffect(() => {
    if (toToken?.address && toToken?.blockchainNetwork) {
      dispatch(
        getTokenPrice({
          address: toToken.address,
          blockchainNetwork: toToken.blockchainNetwork,
          type: "to",
        })
      );
      dispatch(setQuote(null));
    }
  }, [dispatch, toToken?.address, toToken?.blockchainNetwork]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (
      fromToken?.blockchainNetwork !== "pulsechain" ||
      toToken?.blockchainNetwork !== "pulsechain"
    ) {
      return;
    }

    if (fromToken?.address && toToken?.address && fromAmount) {
      dispatch(setQuote(null));

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      timeoutRef.current = setTimeout(() => {
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

        intervalRef.current = setInterval(() => {
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
        }, 10000);
      }, 3000);
    } else {
      dispatch(setQuote(null));
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    dispatch,
    fromToken?.address,
    toToken?.address,
    fromAmount,
    fromToken?.decimals,
    slippage,
  ]);

  useEffect(() => {
    if (fromToken?.address && fromAmount && fromToken?.decimals && account) {
      dispatch(
        checkTokenAllowance({
          tokenAddress: fromToken?.address || "",
          amount: fromAmount,
          decimals: fromToken?.decimals || 0,
          userAddress: account || "",
        })
      );
    }
  }, [dispatch, fromToken?.address, fromAmount, fromToken?.decimals, account]);

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
            allChains={allChains}
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
        chain={chain}
        setChain={setChain}
        selectType={selectType}
        searchChain={searchChain}
        setSearchChain={setSearchChain}
        searchToken={searchToken}
        setSearchToken={setSearchToken}
        availableTokens={availableTokens.filter(
          (token) =>
            token.symbol.toLowerCase().includes(searchToken.toLowerCase()) ||
            token.address.toLowerCase().includes(searchToken.toLowerCase())
        )}
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
