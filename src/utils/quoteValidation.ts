import {
  AbiCoder,
  ZeroAddress,
  getBytes,
  keccak256,
  parseUnits,
  verifyMessage,
} from "ethers";
import { AffiliateRouterAddress } from "../const/swap";
import {
  QuoteRouteSummary,
  QuoteType,
  TokenType,
} from "../types/Swap";
import { decodeSwapRouteSummary } from "./routeEncoding";

const PAYLOAD_TYPES = [
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

const UNIT_BPS = 10_000n;
const MAX_CLOCK_SKEW_SECONDS = 300;
const MIN_DEADLINE_BUFFER_SECONDS = 30;

const abiCoder = new AbiCoder();

const normalizeAddress = (value?: string | null): string =>
  (value ?? "").trim().toLowerCase();

const isNative = (value: string): boolean => {
  const normalized = normalizeAddress(value);
  return (
    normalized === "pls" ||
    normalized === "0x0" ||
    normalized === "" ||
    normalized === ZeroAddress.toLowerCase()
  );
};

const addressesMatch = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) {
    return false;
  }

  if (normalizeAddress(a) === normalizeAddress(b)) {
    return true;
  }

  return isNative(a) && isNative(b);
};

const clampSlippageBps = (value: number): bigint => {
  if (!Number.isFinite(value) || value < 0) {
    return 0n;
  }
  if (value > 100) {
    return UNIT_BPS;
  }
  return BigInt(Math.round(value * 100));
};

export class QuoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteValidationError";
  }
}

export interface QuoteValidationContext {
  fromToken: TokenType | null;
  toToken: TokenType | null;
  fromAmount: string;
  slippage: number;
}

export interface QuoteValidationResult {
  decodedRoute: QuoteRouteSummary;
  uiMinAmountOut: string;
  checkedAt: number;
}

const expectedSigner = (): string => {
  const signer = (import.meta.env.VITE_QUOTE_SIGNER_ADDRESS ?? "").trim();
  if (!signer) {
    throw new QuoteValidationError(
      "Missing VITE_QUOTE_SIGNER_ADDRESS configuration"
    );
  }
  return signer.toLowerCase();
};

const encodePayload = (payload: QuoteType["integrity"]["payload"]) =>
  abiCoder.encode(PAYLOAD_TYPES, [
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

const requireToken = (token: TokenType | null, role: "from" | "to") => {
  if (!token) {
    throw new QuoteValidationError(`Missing ${role} token selection`);
  }
  return token;
};

const requireAmount = (amount: string): string => {
  const trimmed = (amount ?? "").trim();
  if (!trimmed) {
    throw new QuoteValidationError("Missing swap amount");
  }
  return trimmed;
};

export const validateQuoteIntegrity = (
  quote: QuoteType,
  context: QuoteValidationContext
): QuoteValidationResult => {
  if (!quote?.integrity) {
    throw new QuoteValidationError("Quote is missing integrity metadata");
  }

  const fromToken = requireToken(context.fromToken, "from");
  const toToken = requireToken(context.toToken, "to");

  const normalizedFromAmount = requireAmount(context.fromAmount);
  const normalizedFromAddress = normalizeAddress(fromToken.address);
  const normalizedToAddress = normalizeAddress(toToken.address);

  if (
    !addressesMatch(quote.tokenInAddress, normalizedFromAddress) ||
    !addressesMatch(quote.tokenOutAddress, normalizedToAddress)
  ) {
    throw new QuoteValidationError("Quote tokens do not match the UI selection");
  }

  const decodedRoute = decodeSwapRouteSummary(quote.calldata);

  if (
    !addressesMatch(decodedRoute.tokenIn, normalizedFromAddress) ||
    !addressesMatch(decodedRoute.tokenOut, normalizedToAddress)
  ) {
    throw new QuoteValidationError(
      "Calldata tokens do not match the requested route"
    );
  }

  const payload = quote.integrity.payload;
  const now = Math.floor(Date.now() / 1000);

  if (payload.router.toLowerCase() !== AffiliateRouterAddress.toLowerCase()) {
    throw new QuoteValidationError("Quote is not targeting the AffiliateRouter");
  }

  if (payload.version !== 1) {
    throw new QuoteValidationError(`Unsupported quote payload version ${payload.version}`);
  }

  if (Math.abs(now - payload.issuedAt) > MAX_CLOCK_SKEW_SECONDS) {
    throw new QuoteValidationError("Quote issuance timestamp is stale");
  }

  if (
    payload.calldataHash.toLowerCase() !==
    keccak256(quote.calldata).toLowerCase()
  ) {
    throw new QuoteValidationError("Calldata hash mismatch");
  }

  if (payload.deadline !== quote.deadline || payload.deadline !== decodedRoute.deadline) {
    throw new QuoteValidationError("Deadline mismatch between payload and calldata");
  }

  if (payload.deadline - now < MIN_DEADLINE_BUFFER_SECONDS) {
    throw new QuoteValidationError("Quote deadline is about to expire");
  }

  if (payload.minAmountOut !== quote.minAmountOut) {
    throw new QuoteValidationError("Payload minAmountOut mismatch");
  }

  if (decodedRoute.minAmountOut !== quote.minAmountOut) {
    throw new QuoteValidationError("Calldata minAmountOut mismatch");
  }

  const parsedAmountIn = parseUnits(normalizedFromAmount, fromToken.decimals).toString();
  if (decodedRoute.amountIn !== parsedAmountIn) {
    throw new QuoteValidationError("Calldata amountIn mismatch");
  }

  if (payload.amountIn !== decodedRoute.amountIn) {
    throw new QuoteValidationError("Payload amountIn mismatch");
  }

  const signer = expectedSigner();
  const digest = keccak256(encodePayload(payload));
  const recovered = verifyMessage(getBytes(digest), quote.integrity.signature).toLowerCase();

  if (recovered !== signer || quote.integrity.signer.toLowerCase() !== signer) {
    throw new QuoteValidationError("Quote signature does not match the trusted signer");
  }

  const slippageBps = clampSlippageBps(context.slippage);
  if (BigInt(payload.slippageBps) !== slippageBps) {
    throw new QuoteValidationError("Slippage encoded in quote payload does not match UI tolerance");
  }

  const quotedOutput = BigInt(quote.outputAmount);
  const uiMinAmountOut = ((quotedOutput * (UNIT_BPS - slippageBps)) / UNIT_BPS).toString();

  if (BigInt(decodedRoute.minAmountOut) < BigInt(uiMinAmountOut)) {
    throw new QuoteValidationError(
      "Calldata minAmountOut is lower than the UI slippage tolerance"
    );
  }

  return {
    decodedRoute,
    uiMinAmountOut,
    checkedAt: Date.now(),
  };
};
