import { PulsexToken } from "./PulsexTokens";

export interface TokenType extends PulsexToken {
  image?: string;
  blockchainNetwork?: string;
  network?: string;
  rank?: number;
  type?: string;
  usdPrice?: number;
  token_security?: any;
  network_rank?: number;
  price?: number;
  isCustom?: boolean;
}

export interface QuoteIntegrityPayload {
  version: number;
  router: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  deadline: number;
  calldataHash: string;
  issuedAt: number;
  slippageBps: number;
}

export interface QuoteIntegrity {
  payload: QuoteIntegrityPayload;
  signature: string;
  signer: string;
}

export interface QuoteRouteSummary {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  deadline: number;
  destination: string;
  isETHOut: boolean;
}

export interface QuoteType {
  calldata: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: string;
  minAmountOut: string;
  outputAmount: string;
  deadline: number;
  gasUSDEstimated: number;
  gasAmountEstimated?: number;
  route: RouteType[];
  integrity: QuoteIntegrity;
  decodedRoute?: QuoteRouteSummary;
  verifiedAt?: number;
  uiMinAmountOut?: string;
}

export type UnsignedQuoteType = Omit<QuoteType, "integrity" | "decodedRoute" | "verifiedAt" | "uiMinAmountOut">;

export interface RouteType {
  percent: number;
  subroutes: SubrouteType[];
}

export interface SubrouteType {
  percent: number;
  paths: PathType[];
}

export interface PathType {
  exchange: string;
  percent: number;
  tokens: RouteTokenType[];
}

export interface RouteTokenType {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
}
