import { AbiCoder, ZeroAddress, Wallet, getBytes, keccak256 } from "ethers";
import { describe, expect, it, vi } from "vitest";
import { AffiliateRouterAddress } from "../const/swap";
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
});
