import Web3 from "web3";
import { AbiItem } from "web3-utils";
import SwapManagerABI from "../abis/SwapManager.json";
import ERC20ABI from "../abis/ERC20.json";
import { QuoteType, TokenType } from "../types/Swap";
import { PulseChainConfig } from "../config/chainConfig";
import { SwapManagerAddress } from "../const/swap";
import { BigNumberish, ethers, ZeroAddress } from "ethers";

export interface ApprovalParams {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  account: string;
  decimals: number;
}

export interface SwapParams {
  quote: QuoteType;
  value: string;
  account: string;
  fromToken: TokenType;
  referrerAddress?: string; // Optional referrer address from Redux state
}

export interface ReferralClaimParams {
  tokens: string[];
  account: string;
}

export interface UpdateFeeBasisPointsParams {
  newFeeBasisPoints: string;
  account: string;
}

export const getWeb3 = () =>
  new Web3(
    PulseChainConfig.providerList[
      Math.floor(Math.random() * PulseChainConfig.providerList.length)
    ]
  );

export const getProvider = () => {
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
 * Initialize SwapManager instance
 */
export const initializeSwapManager = () => {
  try {
    const web3 = getProvider();
    const swapManagerContract = new web3.eth.Contract(
      SwapManagerABI as unknown as AbiItem[],
      SwapManagerAddress
    );

    return {
      web3,
      swapManagerContract,
    };
  } catch (error) {
    console.error("Failed to initialize SwapManager:", error);
    throw new Error("SwapManager initialization failed");
  }
};

// Helper function to check if token is native
export const isNativeToken = (tokenAddress: string): boolean => {
  return tokenAddress.toLowerCase() === ZeroAddress.toLowerCase();
};

/**
 * Get token balance for an account
 */
export const getTokenBalance = async (
  tokenAddress: string,
  account: string,
  decimals: number
): Promise<string> => {
  try {
    const web3 = getWeb3(); // Use public RPC for read operations

    // Handle native token balance
    if (isNativeToken(tokenAddress)) {
      const balance = await web3.eth.getBalance(account);
      return balance.toString(); // Convert bigint to string
    }

    // Handle ERC20 token balance
    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    const balance: string = await tokenContract.methods
      .balanceOf(account)
      .call();
    return balance; // Return raw balance in wei
  } catch (error) {
    console.error("Failed to get token balance:", error);
    throw new Error("Failed to fetch token balance");
  }
};

/**
 * Get token allowance for a spender
 */
export const getTokenAllowance = async (
  tokenAddress: string,
  owner: string,
  spender: string,
  decimals: number
): Promise<string> => {
  try {
    // Native tokens don't need allowance
    if (isNativeToken(tokenAddress)) {
      return "0";
    }

    const web3 = getWeb3(); // Use public RPC for read operations
    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );
    const allowance: string = await tokenContract.methods
      .allowance(owner, spender)
      .call();
    return allowance;
  } catch (error) {
    console.error("Failed to get token allowance:", error);
    throw new Error("Failed to fetch token allowance");
  }
};

/**
 * Check if approval is needed
 */
export const needsApproval = async (
  tokenAddress: string,
  owner: string,
  spender: string,
  amount: string,
  decimals: number
): Promise<boolean> => {
  try {
    // Native tokens don't need approval
    if (isNativeToken(tokenAddress)) {
      return false;
    }

    const allowance: string = await getTokenAllowance(
      tokenAddress,
      owner,
      spender,
      decimals
    );

    // Convert amount to wei for comparison
    const amountInWei = ethers.parseUnits(amount, decimals).toString();

    return BigInt(allowance) >= BigInt(amountInWei);
  } catch (error) {
    console.error("Failed to check approval status:", error);
    throw new Error("Failed to check approval status");
  }
};

/**
 * Approve token spending
 */
export const approveToken = async (params: ApprovalParams): Promise<any> => {
  try {
    // Native tokens don't need approval
    if (isNativeToken(params.tokenAddress)) {
      return { transactionHash: "0x" };
    }

    const web3 = getProvider(); // Use wallet provider for transactions
    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      params.tokenAddress
    );

    const amountInWei = ethers.parseUnits(
      (Number(params.amount) * 1.01).toFixed(params.decimals),
      params.decimals
    );

    // Execute approval transaction
    const transaction = await tokenContract.methods
      .approve(params.spenderAddress, amountInWei)
      .send({
        from: params.account,
      });

    await waitForTransaction(transaction.transactionHash, 1);

    return transaction;
  } catch (error) {
    console.error("Approval failed:", error);
    throw new Error("Token approval failed");
  }
};

/**
 * Execute swap transaction
 */
export const executeSwap = async (params: SwapParams): Promise<any> => {
  try {
    const { quote, value, account, fromToken, referrerAddress } = params;
    const web3 = getProvider(); // Use wallet provider for transactions
    const swapManagerContract = new web3.eth.Contract(
      SwapManagerABI as unknown as AbiItem[],
      SwapManagerAddress
    );

    // Use referrer address from Redux state, fallback to zero address if not provided
    const referrerCode =
      referrerAddress || "0x0000000000000000000000000000000000000000";

    // Prepare transaction parameters
    const txParams: any = {
      from: account,
    };

    // Add value only if swapping from native token
    if (isNativeToken(fromToken.address) && value && value !== "0") {
      txParams.value = value;
    }

    console.log("referrerCode", referrerCode);

    // Execute swap transaction with referral code
    const transaction = await swapManagerContract.methods
      .executeSwap(quote.calldata, referrerCode)
      .send(txParams);

    await waitForTransaction(transaction.transactionHash, 1);

    return transaction;
  } catch (error) {
    console.error("Swap execution failed:", error);
    throw new Error("Swap transaction failed");
  }
};

/**
 * Update fee basis points for a user
 */
export const updateFeeBasisPoints = async (
  params: UpdateFeeBasisPointsParams
): Promise<any> => {
  try {
    const { newFeeBasisPoints, account } = params;
    const web3 = getProvider(); // Use wallet provider for transactions
    const swapManagerContract = new web3.eth.Contract(
      SwapManagerABI as unknown as AbiItem[],
      SwapManagerAddress
    );
    console.log(newFeeBasisPoints, account);

    // Execute fee basis points update transaction
    const transaction = await swapManagerContract.methods
      .updateFeeBasisPoints(newFeeBasisPoints)
      .send({ from: account });

    await waitForTransaction(transaction.transactionHash, 1);

    return transaction;
  } catch (error) {
    console.error("Fee basis points update failed:", error);
    throw new Error("Fee basis points update failed");
  }
};

/**
 * Get fee basis points for a user
 */
export const getFeeBasisPoints = async (
  userAddress: string
): Promise<string> => {
  try {
    const web3 = getWeb3(); // Use public RPC for read operations
    const swapManagerContract = new web3.eth.Contract(
      SwapManagerABI as unknown as AbiItem[],
      SwapManagerAddress
    );

    const feeBasisPoints: string = await swapManagerContract.methods
      .getFeeBasisPoints(userAddress)
      .call();

    return Number(feeBasisPoints).toString();
  } catch (error) {
    console.error("Failed to get fee basis points:", error);
    throw new Error("Failed to fetch fee basis points");
  }
};

/**
 * Get referrer earnings for multiple tokens
 */
export const getReferrerEarnings = async (
  referrerAddress: string,
  tokens: string[]
): Promise<string[]> => {
  try {
    const web3 = getWeb3(); // Use public RPC for read operations
    const swapManagerContract = new web3.eth.Contract(
      SwapManagerABI as unknown as AbiItem[],
      SwapManagerAddress
    );

    const earnings: string[] = await swapManagerContract.methods
      .getReferrerEarnings(referrerAddress, tokens)
      .call();

    return earnings;
  } catch (error) {
    console.error("Failed to get referrer earnings:", error);
    throw new Error("Failed to fetch referrer earnings");
  }
};

/**
 * Get token decimals
 */
export const getTokenDecimals = async (
  tokenAddress: string
): Promise<number> => {
  try {
    // Native token has 18 decimals
    if (isNativeToken(tokenAddress)) {
      return 18;
    }

    const web3 = getWeb3(); // Use public RPC for read operations
    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    const decimals: string = await tokenContract.methods.decimals().call();
    return Number(decimals);
  } catch (error) {
    console.error("Failed to get token decimals:", error);
    throw new Error("Failed to fetch token decimals");
  }
};

/**
 * Withdraw referral earnings for specified tokens
 */
export const withdrawReferralEarnings = async (
  params: ReferralClaimParams
): Promise<any> => {
  try {
    const { tokens, account } = params;
    const web3 = getProvider(); // Use wallet provider for transactions
    const swapManagerContract = new web3.eth.Contract(
      SwapManagerABI as unknown as AbiItem[],
      SwapManagerAddress
    );

    // Execute referral earnings withdrawal
    const transaction = await swapManagerContract.methods
      .withdrawReferralEarnings(tokens)
      .send({ from: account });

    await waitForTransaction(transaction.transactionHash, 1);

    return transaction;
  } catch (error) {
    console.error("Referral earnings withdrawal failed:", error);
    throw new Error("Referral earnings withdrawal failed");
  }
};
/**
 * Get transaction receipt
 */
export const getTransactionReceipt = async (txHash: string): Promise<any> => {
  try {
    const web3 = getWeb3();
    return await web3.eth.getTransactionReceipt(txHash);
  } catch (error: any) {
    // If the error is 'Transaction not found', treat as not found yet
    if (
      error.message &&
      (error.message.includes("Transaction not found") ||
        error.message.includes("not found"))
    ) {
      return null; // Don't throw, just return null so polling continues
    }
    console.error("Failed to get transaction receipt:", error);
    throw new Error("Failed to fetch transaction receipt");
  }
};

/**
 * Wait for transaction confirmation
 */
export const waitForTransaction = async (
  txHash: string,
  confirmations: number = 1
): Promise<any> => {
  try {
    console.log("Waiting for transaction:", txHash);
    // In web3 v4, we need to poll for transaction receipt
    let receipt = null;
    while (!receipt) {
      receipt = await getTransactionReceipt(txHash);
      if (!receipt) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return receipt;
  } catch (error) {
    console.error("Failed to wait for transaction:", error);
    throw new Error("Transaction confirmation failed");
  }
};

/**
 * Create SwapManager instance and return all functions
 */
export const createSwapManager = () => {
  const instance = initializeSwapManager();

  return {
    // Instance
    instance,

    // Helper functions
    isNativeToken,

    // Core functions
    getTokenBalance: (
      tokenAddress: string,
      account: string,
      decimals: number
    ) => getTokenBalance(tokenAddress, account, decimals),

    getTokenAllowance: (
      tokenAddress: string,
      owner: string,
      spender: string,
      decimals: number
    ) => getTokenAllowance(tokenAddress, owner, spender, decimals),

    needsApproval: (
      tokenAddress: string,
      owner: string,
      spender: string,
      amount: string,
      decimals: number
    ) => needsApproval(tokenAddress, owner, spender, amount, decimals),

    approveToken: (params: ApprovalParams) => approveToken(params),

    executeSwap: (params: SwapParams) => executeSwap(params),

    withdrawReferralEarnings: (params: ReferralClaimParams) =>
      withdrawReferralEarnings(params),

    getFeeBasisPoints: (userAddress: string) => getFeeBasisPoints(userAddress),

    updateFeeBasisPoints: (params: UpdateFeeBasisPointsParams) =>
      updateFeeBasisPoints(params),

    getReferrerEarnings: (referrerAddress: string, tokens: string[]) =>
      getReferrerEarnings(referrerAddress, tokens),

    getTokenDecimals: (tokenAddress: string) => getTokenDecimals(tokenAddress),

    // Utility functions
    getTransactionReceipt: (txHash: string) => getTransactionReceipt(txHash),

    waitForTransaction: (txHash: string, confirmations?: number) =>
      waitForTransaction(txHash, confirmations),

    // Getters
    getWeb3: () => instance.web3,
    getSwapManagerContract: () => instance.swapManagerContract,
  };
};
