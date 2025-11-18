import { AbiCoder, ZeroAddress, Wallet, getBytes, keccak256, parseUnits } from "ethers";
import { describe, expect, it, vi } from "vitest";
import { AffiliateRouterAddress } from "../const/swap";
import { PulsexConfig } from "../config/pulsex";
import { QuoteType, TokenType } from "../types/Swap";
import { validateQuoteIntegrity } from "./quoteValidation";
import { encodeSwapRoute, SwapRoute } from "./routeEncoding";

const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const SIGNATURE_TYPES = [
  "uint8",
  "address",
  "address",
  "address",
  "uint256",
  "uint256",
  "uint256",
  "bytes32",
  "uint256",
  "uint32",
] as const;

const buildTokens = (): { fromToken: TokenType; toToken: TokenType } => ({
  fromToken: {
    address: "0x1111111111111111111111111111111111111111",
    name: "Token In",
    symbol: "TIN",
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
  },
  toToken: {
    address: "0x2222222222222222222222222222222222222222",
    name: "Token Out",
    symbol: "TOUT",
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
  },
});

const wallet = new Wallet(TEST_PRIVATE_KEY);

const buildQuote = async (): Promise<{
  quote: QuoteType;
  fromToken: TokenType;
  toToken: TokenType;
}> => {
  const { fromToken, toToken } = buildTokens();
  const amountIn = "1000000000000000000"; // 1 token
  const minAmountOut = "995000000000000000"; // 0.995 tokens (0.5% slippage)
  const deadline = Math.floor(Date.now() / 1000) + 600;
  const swapRoute: SwapRoute = {
    steps: [],
    parentGroups: [],
    destination: ZeroAddress,
    tokenIn: fromToken.address,
    tokenOut: toToken.address,
    groupCount: 0,
    deadline,
    amountIn,
    amountOutMin: minAmountOut,
    isETHOut: false,
  };

  const calldata = encodeSwapRoute(swapRoute);
  const payload = {
    version: 1,
    router: AffiliateRouterAddress,
    tokenIn: fromToken.address,
    tokenOut: toToken.address,
    amountIn,
    minAmountOut,
    deadline,
    calldataHash: keccak256(calldata),
    issuedAt: Math.floor(Date.now() / 1000),
    slippageBps: 50,
  };

  const encoded = new AbiCoder().encode(SIGNATURE_TYPES, [
    payload.version,
    payload.router,
    payload.tokenIn,
    payload.tokenOut,
    payload.amountIn,
    payload.minAmountOut,
    payload.deadline,
    payload.calldataHash,
    payload.issuedAt,
    payload.slippageBps,
  ]);

  const signature = await wallet.signMessage(getBytes(keccak256(encoded)));

  const quote: QuoteType = {
    calldata,
    tokenInAddress: fromToken.address,
    tokenOutAddress: toToken.address,
    amountIn,
    minAmountOut,
    outputAmount: "1000000000000000000",
    deadline,
    gasUSDEstimated: 2,
    gasAmountEstimated: 200000,
    route: [],
    integrity: {
      payload,
      signature,
      signer: wallet.address,
    },
  };

  return { quote, fromToken, toToken };
};

describe("validateQuoteIntegrity", () => {
  it("accepts a valid signed quote", async () => {
    vi.stubEnv("VITE_QUOTE_SIGNER_ADDRESS", wallet.address);
    const { quote, fromToken, toToken } = await buildQuote();
    const result = validateQuoteIntegrity(quote, {
      fromToken,
      toToken,
      fromAmount: "1",
      slippage: 0.5,
    });

    expect(result.decodedRoute.tokenIn).toBe(fromToken.address);
    expect(result.decodedRoute.tokenOut).toBe(toToken.address);
  });

  it("rejects quotes if calldata hash is tampered", async () => {
    vi.stubEnv("VITE_QUOTE_SIGNER_ADDRESS", wallet.address);
    const { quote, fromToken, toToken } = await buildQuote();
    quote.calldata = "0x1234";

    expect(() =>
      validateQuoteIntegrity(quote, {
        fromToken,
        toToken,
        fromAmount: "1",
        slippage: 0.5,
      })
    ).toThrow();
  });

  it("allows native token selections when calldata wraps through WPLS", async () => {
    vi.stubEnv("VITE_QUOTE_SIGNER_ADDRESS", wallet.address);
    const amountIn = "1000000000000000000";
    const minAmountOut = "1500000000000000000";
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const wpls = PulsexConfig.WPLSAddress;

    const nativeToken: TokenType = {
      address: ZeroAddress,
      name: "PulseChain",
      symbol: "PLS",
      blockchainNetwork: "pulsechain",
      network: "pulsechain",
      decimals: 18,
      image: "",
      rank: 0,
      type: "NATIVE",
      usdPrice: 1,
      token_security: null,
      network_rank: 0,
      price: 1,
    };

    const toToken: TokenType = {
      address: "0x3333333333333333333333333333333333333333",
      name: "Token Out",
      symbol: "OUT",
      blockchainNetwork: "pulsechain",
      network: "pulsechain",
      decimals: 18,
      image: "",
      rank: 0,
      type: "erc20",
      usdPrice: 1,
      token_security: null,
      network_rank: 0,
      price: 1,
    };

    const swapRoute: SwapRoute = {
      steps: [],
      parentGroups: [],
      destination: ZeroAddress,
      tokenIn: wpls,
      tokenOut: toToken.address,
      groupCount: 0,
      deadline,
      amountIn,
      amountOutMin: minAmountOut,
      isETHOut: false,
    };

    const calldata = encodeSwapRoute(swapRoute);
    const payload = {
      version: 1,
      router: AffiliateRouterAddress,
      tokenIn: wpls,
      tokenOut: toToken.address,
      amountIn,
      minAmountOut,
      deadline,
      calldataHash: keccak256(calldata),
      issuedAt: Math.floor(Date.now() / 1000),
      slippageBps: 50,
    };

    const encoded = new AbiCoder().encode(SIGNATURE_TYPES, [
      payload.version,
      payload.router,
      payload.tokenIn,
      payload.tokenOut,
      payload.amountIn,
      payload.minAmountOut,
      payload.deadline,
      payload.calldataHash,
      payload.issuedAt,
      payload.slippageBps,
    ]);

    const signature = await wallet.signMessage(getBytes(keccak256(encoded)));

    const quote: QuoteType = {
      calldata,
      tokenInAddress: ZeroAddress,
      tokenOutAddress: toToken.address,
      amountIn,
      minAmountOut,
      outputAmount: "1500000000000000000",
      deadline,
      gasUSDEstimated: 2,
      gasAmountEstimated: 200000,
      route: [],
      integrity: {
        payload,
        signature,
        signer: wallet.address,
      },
    };

    expect(() =>
      validateQuoteIntegrity(quote, {
        fromToken: nativeToken,
        toToken,
        fromAmount: "1",
        slippage: 0.5,
      })
    ).not.toThrow();
  });
  it("accepts PulseX stable steps carrying userData", async () => {
    vi.stubEnv("VITE_QUOTE_SIGNER_ADDRESS", wallet.address);
    const { fromToken, toToken } = buildTokens();
    const amountIn = "1000000000000000000";
    const minAmountOut = "990000000000000000";
    const deadline = Math.floor(Date.now() / 1000) + 600;

    const swapRoute: SwapRoute = {
      steps: [
        {
          dex: "pulsexStable",
          path: [fromToken.address, toToken.address],
          pool: PulsexConfig.PulsexStablePoolAddress,
          percent: 100000,
          groupId: 0,
          parentGroupId: 0,
          userData: "0x0102",
        },
      ],
      parentGroups: [{ id: 0, percent: 100000 }],
      destination: ZeroAddress,
      tokenIn: fromToken.address,
      tokenOut: toToken.address,
      groupCount: 1,
      deadline,
      amountIn,
      amountOutMin: minAmountOut,
      isETHOut: false,
    };

    const calldata = encodeSwapRoute(swapRoute);
    const payload = {
      version: 1,
      router: AffiliateRouterAddress,
      tokenIn: fromToken.address,
      tokenOut: toToken.address,
      amountIn,
      minAmountOut,
      deadline,
      calldataHash: keccak256(calldata),
      issuedAt: Math.floor(Date.now() / 1000),
      slippageBps: 100,
    };

    const encoded = new AbiCoder().encode(SIGNATURE_TYPES, [
      payload.version,
      payload.router,
      payload.tokenIn,
      payload.tokenOut,
      payload.amountIn,
      payload.minAmountOut,
      payload.deadline,
      payload.calldataHash,
      payload.issuedAt,
      payload.slippageBps,
    ]);

    const signature = await wallet.signMessage(getBytes(keccak256(encoded)));

    const quote: QuoteType = {
      calldata,
      tokenInAddress: fromToken.address,
      tokenOutAddress: toToken.address,
      amountIn,
      minAmountOut,
      outputAmount: "1000000000000000000",
      deadline,
      gasUSDEstimated: 2,
      gasAmountEstimated: 200000,
      route: [],
      integrity: {
        payload,
        signature,
        signer: wallet.address,
      },
    };

    expect(() =>
      validateQuoteIntegrity(quote, {
        fromToken,
        toToken,
        fromAmount: "1",
        slippage: 1,
      })
    ).not.toThrow();
  });

  it("accepts mixed PulseX V2 legs that pivot through the stable pool", async () => {
    vi.stubEnv("VITE_QUOTE_SIGNER_ADDRESS", wallet.address);
    const { fromToken, toToken } = buildTokens();
    const pivotToken: TokenType = {
      ...fromToken,
      address: "0x3333333333333333333333333333333333333333",
      symbol: "USDT",
    };
    const amountIn = parseUnits("1", fromToken.decimals).toString();
    const minAmountOut = parseUnits("1.04", toToken.decimals).toString();
    const deadline = Math.floor(Date.now() / 1000) + 600;

    const swapRoute: SwapRoute = {
      steps: [
        {
          dex: "pulsexStable",
          path: [fromToken.address, pivotToken.address],
          pool: PulsexConfig.PulsexStablePoolAddress,
          percent: 100000,
          groupId: 0,
          parentGroupId: 0,
          userData: "0x0001",
        },
        {
          dex: "pulsexV2",
          path: [pivotToken.address, toToken.address],
          pool: "0x4444444444444444444444444444444444444444",
          percent: 100000,
          groupId: 1,
          parentGroupId: 0,
          userData: "0x",
        },
      ],
      parentGroups: [
        { id: 0, percent: 100000 },
        { id: 1, percent: 100000 },
      ],
      destination: ZeroAddress,
      tokenIn: fromToken.address,
      tokenOut: toToken.address,
      groupCount: 2,
      deadline,
      amountIn,
      amountOutMin: minAmountOut,
      isETHOut: false,
    };

    const calldata = encodeSwapRoute(swapRoute);
    const payload = {
      version: 1,
      router: AffiliateRouterAddress,
      tokenIn: fromToken.address,
      tokenOut: toToken.address,
      amountIn,
      minAmountOut,
      deadline,
      calldataHash: keccak256(calldata),
      issuedAt: Math.floor(Date.now() / 1000),
      slippageBps: 100,
    };

    const encoded = new AbiCoder().encode(SIGNATURE_TYPES, [
      payload.version,
      payload.router,
      payload.tokenIn,
      payload.tokenOut,
      payload.amountIn,
      payload.minAmountOut,
      payload.deadline,
      payload.calldataHash,
      payload.issuedAt,
      payload.slippageBps,
    ]);

    const signature = await wallet.signMessage(getBytes(keccak256(encoded)));

    const quote: QuoteType = {
      calldata,
      tokenInAddress: fromToken.address,
      tokenOutAddress: toToken.address,
      amountIn,
      minAmountOut,
      outputAmount: parseUnits("1.05", toToken.decimals).toString(),
      deadline,
      gasUSDEstimated: 3,
      gasAmountEstimated: 300000,
      route: [],
      integrity: {
        payload,
        signature,
        signer: wallet.address,
      },
    };

    expect(() =>
      validateQuoteIntegrity(quote, {
        fromToken,
        toToken,
        fromAmount: "1",
        slippage: 1,
      })
    ).not.toThrow();
  });
});
