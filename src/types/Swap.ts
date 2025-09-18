export interface TokenType {
  address: string;
  name: string;
  symbol: string;
  blockchainNetwork: string;
  network: string;
  decimals: number;
  image: string;
  rank: number;
  type: string;
  usdPrice: number;
  token_security: any;
  network_rank: number;
  price: number;
}

export interface QuoteType {
  calldata: string;
  tokenInAdress: string;
  tokenOutAddress: string;
  outputAmount: number;
  gasUSDEstimated: number;
  route: RouteType[];
}

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
