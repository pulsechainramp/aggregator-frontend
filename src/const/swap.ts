export enum TokenGlobTag {
  All = "All",
  Popular = "Popular",
  Promo = "Promo",
  "Layer-2" = "Layer-2",
  EVM = "EVM",
  NonEVM = "Non-EVM",
}

export const ZeroAddress = "0x0000000000000000000000000000000000000000";

export const SwapManagerAddress = "0x484f957900F15919f9d3D48e70703d66f34A22DE";
export const BridgeManagerAddress =
  "0x1715a3E4A142d8b698131108995174F37aEBA10D";
export const BridgeManagerAddressForNative =
  "0x8AC4ae65b3656e26dC4e0e69108B392283350f55";
// export const BackendURL = "http://135.181.55.207:3000/";
export const BackendURL = "https://pt-quote-api.vercel.app/";

export const PiteasBaseURL = "https://sdk.piteas.io/";  // per Piteas monorepo docs
export const PreferClientPiteasFirst = true;            // feature flag for rollout
export const ClientQuoteTTLms = 15_000;                 // cache lifetime (15s)
export const ClientQuoteDebounceMs = 600;               // UI debounce
export const ClientPiteasMaxPerMinute = 9;              // <= 9 per minute

export const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
export const USDC = "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07"; // 6 decimals
export const DAI  = "0xefD766cCb38EaF1dfd701853BFCe31359239F305"; // 18 decimals