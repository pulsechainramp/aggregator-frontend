export type PulsexTokenOrigin = "native" | "bridged-eth" | "prefork" | "unknown";

export type PulsexTokenTier = "core" | "verified" | "unverified";

export type PulsexTokenStatus = "active" | "abandoned" | "spam" | "unknown";

export interface PulsexTokenSources {
  core?: boolean;
  piteas?: boolean;
  pls369?: boolean;
}

export interface PulsexToken {
  chainId: 369;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  origin: PulsexTokenOrigin;
  originChainId?: 1;
  originAddress?: string;
  tier: PulsexTokenTier;
  status: PulsexTokenStatus;
  logoURI?: string;
  remoteLogoURIs?: string[];
  sources: PulsexTokenSources;
  tags?: string[];
}

export interface EthToken {
  chainId: 1;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  remoteLogoURIs?: string[];
  tags?: string[];
  isNative?: boolean;
}
