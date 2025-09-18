export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  chainId: number;
}

export const addTokenToWallet = async (
  token: TokenInfo,
  wallet: any
): Promise<boolean> => {
  if (!wallet?.provider) {
    console.error("No wallet provider available");
    return false;
  }

  try {
    const provider = wallet.provider;
    
    // Check if the wallet supports adding tokens
    if (provider.request) {
      await provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            image: token.image,
          },
        },
      });
      return true;
    }
  } catch (error) {
    console.error("Failed to add token to wallet:", error);
    return false;
  }

  return false;
};

export const addTokenToWalletWithFallback = async (
  token: TokenInfo,
  wallet: any
): Promise<boolean> => {
  // Try the modern wallet_watchAsset method first
  const success = await addTokenToWallet(token, wallet);
  
  if (success) {
    return true;
  }

  // Fallback: Try to use the legacy method or show instructions
  console.warn("Modern token addition failed, showing fallback instructions");
  return false;
};

export const getTokenDisplayInfo = (token: TokenInfo) => {
  return {
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
    chainId: token.chainId,
  };
}; 