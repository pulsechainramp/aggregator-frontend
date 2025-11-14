import { useMemo } from "react";
import { ethers } from "ethers";
import { useAppSelector } from "../store/hooks";
import { useReferralFeeState } from "./useReferralFeeState";
import useWallet from "./useWallet";

export interface QuoteSummary {
  hasQuote: boolean;
  fromAmountNumber: number;
  toTokenAmount: number;
  minOutput: number;
  netToTokenAmount: number;
  netMinOutput: number;
  referralFeeBps: number;
  referralMultiplier: number;
  referralFeeTokenAmount: number;
  referralFeeUsdAmount: number;
  priceImpact: number;
  exchangeRate: number;
  toTokenUsdPrice: number | null;
  fromTokenUsdPrice: number | null;
  fromTokenSymbol?: string;
  toTokenSymbol?: string;
  networkFeeUsd: number | null;
  slippage: number;
}

const parseUsd = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const useQuoteSummary = (): QuoteSummary => {
  const { fromToken, toToken, quote, slippage, fromAmount } = useAppSelector(
    (state) => state.swap
  );
  const referralAddress = useAppSelector(
    (state) => state.referral.referralAddress?.address
  );
  const referralFeeState = useReferralFeeState();
  const { account } = useWallet();

  return useMemo(() => {
    const hasQuote = Boolean(quote && toToken && fromToken && fromAmount);
    const toDecimals = toToken?.decimals ?? 18;
    const fromAmountNumber = Number(fromAmount) || 0;

    const toTokenAmount =
      hasQuote && quote?.outputAmount
        ? Number(ethers.formatUnits(quote.outputAmount, toDecimals))
        : 0;

    const minOutput =
      hasQuote && quote?.uiMinAmountOut
        ? Number(ethers.formatUnits(quote.uiMinAmountOut, toDecimals))
        : toTokenAmount * (1 - (Number(slippage) || 0) / 100);

    const toTokenUsdPrice = parseUsd(
      typeof toToken?.price === "number" && Number.isFinite(toToken.price)
        ? toToken.price
        : toToken?.usdPrice
    );
    const fromTokenUsdPrice = parseUsd(
      typeof fromToken?.price === "number" && Number.isFinite(fromToken.price)
        ? fromToken.price
        : fromToken?.usdPrice
    );

    const normalizedAccount = account?.toLowerCase();
    const normalizedReferral = referralAddress?.toLowerCase();
    const isSelfReferral =
      normalizedAccount && normalizedReferral
        ? normalizedAccount === normalizedReferral
        : false;

    const effectiveReferralBps = isSelfReferral
      ? referralFeeState.tailBps
      : referralFeeState.activeBps;
    const activeReferralBps =
      effectiveReferralBps > 0
        ? effectiveReferralBps
        : referralFeeState.tailBps ?? 0;

    const referralMultiplier =
      activeReferralBps > 0 ? 1 - activeReferralBps / 10000 : 1;

    const netToTokenAmount = toTokenAmount * referralMultiplier;
    const netMinOutput = minOutput * referralMultiplier;
    const referralFeeTokenAmount = toTokenAmount - netToTokenAmount;
    const referralFeeUsdAmount =
      typeof toTokenUsdPrice === "number"
        ? referralFeeTokenAmount * toTokenUsdPrice
        : 0;

    let priceImpact = 0;
    if (
      fromAmountNumber > 0 &&
      typeof fromTokenUsdPrice === "number" &&
      typeof toTokenUsdPrice === "number" &&
      fromTokenUsdPrice > 0 &&
      toTokenUsdPrice > 0
    ) {
      const fairOutput =
        (fromAmountNumber * fromTokenUsdPrice) / toTokenUsdPrice;
      const effectiveOutput = netToTokenAmount;
      if (fairOutput > 0 && effectiveOutput > 0) {
        priceImpact = ((effectiveOutput - fairOutput) / fairOutput) * 100;
      }
    }

    const exchangeRate =
      toTokenAmount > 0 ? fromAmountNumber / toTokenAmount : 0;

    const networkFeeUsd =
      typeof quote?.gasUSDEstimated === "number"
        ? quote.gasUSDEstimated
        : quote?.gasUSDEstimated
        ? Number(quote.gasUSDEstimated)
        : null;

    return {
      hasQuote,
      fromAmountNumber,
      toTokenAmount,
      minOutput,
      netToTokenAmount,
      netMinOutput,
      referralFeeBps: activeReferralBps,
      referralMultiplier,
      referralFeeTokenAmount,
      referralFeeUsdAmount,
      priceImpact,
      exchangeRate,
      toTokenUsdPrice,
      fromTokenUsdPrice,
      fromTokenSymbol: fromToken?.symbol,
      toTokenSymbol: toToken?.symbol,
      networkFeeUsd,
      slippage: Number(slippage) || 0,
    };
  }, [
    account,
    fromAmount,
    fromToken,
    quote,
    referralAddress,
    referralFeeState.activeBps,
    referralFeeState.tailBps,
    slippage,
    toToken,
  ]);
};
