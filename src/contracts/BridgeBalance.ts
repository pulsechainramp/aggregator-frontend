import Web3 from "web3";
import { AbiItem } from "web3-utils";
import ERC20ABI from "../abis/ERC20.json";
import { PulseChainConfig, EthereumConfig } from "../config/chainConfig";
import { ZeroAddress, formatUnits, parseUnits } from "ethers";

export interface BalanceParams {
  tokenAddress: string;
  account: string;
  chainId: number;
  decimals: number;
}

// Helper function to check if token is native
export const isNativeToken = (tokenAddress: string): boolean => {
  return tokenAddress.toLowerCase() === ZeroAddress.toLowerCase();
};

// Get the appropriate RPC URL based on chain ID
export const getRpcUrl = (chainId: number): string => {
  const config = chainId === 1 ? EthereumConfig : PulseChainConfig;
  return config.providerList[0];
};

// Get Web3 instance for a specific chain
export const getWeb3ForChain = (chainId: number): Web3 => {
  const rpcUrl = getRpcUrl(chainId);
  return new Web3(rpcUrl);
};

// Get provider from wallet (for write operations)
export const getWalletProvider = (): Web3 => {
  // First try to get provider from window object
  let provider = (window as any).provider;

  // If not found in window, try to get from web3-onboard
  if (!provider) {
    // Try to get from web3-onboard if available
    const web3Onboard = (window as any).web3Onboard;
    if (
      web3Onboard &&
      web3Onboard.state &&
      web3Onboard.state.wallets.length > 0
    ) {
      provider = web3Onboard.state.wallets[0].provider;
    }
  }

  if (!provider) {
    throw new Error("No wallet provider found. Please connect your wallet.");
  }

  return new Web3(provider);
};

/**
 * Get token balance for an account on a specific chain
 */
export const getTokenBalance = async (params: BalanceParams): Promise<string> => {
  const { tokenAddress, account, chainId, decimals } = params;
  
  try {
    const web3 = getWeb3ForChain(chainId);

    // Handle native token balance (ETH/PLS)
    if (isNativeToken(tokenAddress)) {
      const balance = await web3.eth.getBalance(account);
      return balance.toString();
    }

    // Handle ERC20 token balance
    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    const balance = await tokenContract.methods.balanceOf(account).call();
    return String(balance);
  } catch (error) {
    console.error(`Error getting token balance for chain ${chainId}:`, error);
    return "0";
  }
};

/**
 * Get formatted token balance (human readable)
 */
export const getFormattedTokenBalance = async (params: BalanceParams): Promise<string> => {
  const { decimals } = params;
  
  try {
    const balanceWei = await getTokenBalance(params);
    
    if (balanceWei === "0") {
      return "0.00";
    }
    
    const balanceHuman = formatUnits(balanceWei, decimals);
    
    const parts = balanceHuman.split('.');
    if (parts.length === 1) {
      return `${parts[0]}.000000`;
    }
    const decimalsStr = parts[1].padEnd(6, '0').substring(0, 6);
    return `${parts[0]}.${decimalsStr}`;
  } catch (error) {
    console.error("Error formatting token balance:", error);
    return "0.00";
  }
};

/**
 * Get token allowance for a specific spender
 */
export const getTokenAllowance = async (
  tokenAddress: string,
  owner: string,
  spender: string,
  chainId: number
): Promise<string> => {
  try {
    const web3 = getWeb3ForChain(chainId);
    
    // Native tokens don't need allowance
    if (isNativeToken(tokenAddress)) {
      return "0";
    }

    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    const allowance = await tokenContract.methods.allowance(owner, spender).call();
    return String(allowance);
  } catch (error) {
    console.error(`Error getting token allowance for chain ${chainId}:`, error);
    return "0";
  }
};

/**
 * Check if user has sufficient balance
 */
export const hasSufficientBalance = async (
  tokenAddress: string,
  account: string,
  amount: string,
  chainId: number,
  decimals: number
): Promise<boolean> => {
  try {
    const balanceWei = await getTokenBalance({ tokenAddress, account, chainId, decimals });
    
    // Convert required amount to wei using parseUnits (safe)
    const requiredAmountWei = parseUnits(amount, decimals);
    const balanceWeiBigInt = BigInt(balanceWei);
    
    // Use BigInt comparison for precision
    return balanceWeiBigInt >= requiredAmountWei;
  } catch (error) {
    console.error("Error checking sufficient balance:", error);
    return false;
  }
}; 