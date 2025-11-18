import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import RouteDetailsPopup from "./RouteDetailPopup";
import type { QuoteType, RouteType, TokenType } from "../../types/Swap";

const buildToken = (overrides: Partial<TokenType>): TokenType => ({
  address: "0x0000000000000000000000000000000000000001",
  name: "Token",
  symbol: "TKN",
  blockchainNetwork: "pulse",
  network: "pulse",
  decimals: 18,
  image: "",
  rank: 0,
  type: "erc20",
  usdPrice: 1,
  token_security: null,
  network_rank: 0,
  price: 1,
  ...overrides,
});

const buildQuoteFixture = () => {
  const fromToken = buildToken({
    address: "0x1111111111111111111111111111111111111111",
    symbol: "USDC",
    decimals: 6,
  });
  const pivotToken = buildToken({
    address: "0x2222222222222222222222222222222222222222",
    symbol: "WPLS",
  });
  const toToken = buildToken({
    address: "0x3333333333333333333333333333333333333333",
    symbol: "PLSX",
  });

  const route: RouteType[] = [
    {
      percent: 100,
      subroutes: [
        {
          percent: 100,
          paths: [
            {
              exchange: "PulseX Stable",
              percent: 60,
              tokens: [
                {
                  address: fromToken.address,
                  symbol: fromToken.symbol,
                  decimals: fromToken.decimals,
                  chainId: 369,
                },
                {
                  address: pivotToken.address,
                  symbol: pivotToken.symbol,
                  decimals: pivotToken.decimals,
                  chainId: 369,
                },
              ],
            },
            {
              exchange: "PulseX V2",
              percent: 40,
              tokens: [
                {
                  address: pivotToken.address,
                  symbol: pivotToken.symbol,
                  decimals: pivotToken.decimals,
                  chainId: 369,
                },
                {
                  address: toToken.address,
                  symbol: toToken.symbol,
                  decimals: toToken.decimals,
                  chainId: 369,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const quote: QuoteType = {
    calldata: "0x",
    tokenInAddress: fromToken.address,
    tokenOutAddress: toToken.address,
    amountIn: "100000000",
    minAmountOut: "900000000000000000",
    outputAmount: "1000000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 600,
    gasUSDEstimated: 2,
    gasAmountEstimated: 200000,
    route,
    integrity: {
      payload: {
        version: 1,
        router: "0x0000000000000000000000000000000000000000",
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amountIn: "100000000",
        minAmountOut: "900000000000000000",
        deadline: Math.floor(Date.now() / 1000) + 600,
        calldataHash: "0x0",
        issuedAt: Math.floor(Date.now() / 1000),
        slippageBps: 50,
      },
      signature: "0x0",
      signer: "0x0000000000000000000000000000000000000000",
    },
  };

  return { quote, fromToken, toToken };
};

const renderWithQuote = (quote: QuoteType, fromToken: TokenType, toToken: TokenType) => {
  const swapState = {
    allChains: [],
    availableTokens: [],
    fromToken,
    toToken,
    fromAmount: "",
    quote,
    slippage: 0.5,
    fromTokenBalance: "0",
    toTokenBalance: "0",
    nativeBalance: "0",
    isApproving: false,
    isSwapping: false,
    isApproved: false,
    transactionHash: null,
    isPulseXLoading: false,
    isPiteamsLoading: false,
    showBetterRouterMessage: false,
    hasCalledPulseXOnce: false,
    lastPulseXParams: null,
    latestAllowanceRequestId: null,
  };

  const store = configureStore({
    reducer: {
      swap: (state = swapState) => state,
      bridge: (state = {}) => state,
      activity: (state = {}) => state,
      referral: (state = {}) => state,
    },
  });

  render(
    <Provider store={store}>
      <RouteDetailsPopup />
    </Provider>
  );
};

describe("RouteDetailsPopup", () => {
  it("renders PulseX stable legs in the route breakdown", () => {
    const { quote, fromToken, toToken } = buildQuoteFixture();
    renderWithQuote(quote, fromToken, toToken);

    expect(screen.getByText("Route Details")).toBeInTheDocument();
    expect(screen.getByText("PulseX Stable")).toBeInTheDocument();
    expect(screen.getByText("PulseX V2")).toBeInTheDocument();
  });
});
