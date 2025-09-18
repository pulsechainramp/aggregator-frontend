import Web3 from "web3";
import { AbiItem } from "web3-utils";
import BridgeManagerABI from "../abis/BridgeManager.json";
import BridgeManagerABIForNative from "../abis/BridgeManagerNativeETH.json";
import ERC20ABI from "../abis/ERC20.json";
import {
  BridgeManagerAddress,
  BridgeManagerAddressForNative,
} from "../const/swap";
import { getWeb3ForChain, getWalletProvider } from "./BridgeBalance";
import { ethers } from "ethers";

export interface BridgeParams {
  tokenAddress: string;
  amount: string;
  receiver: string;
  chainId: number;
}

/**
 * Initialize BridgeManager contract
 */
export const initializeBridgeManager = (
  chainId: number,
  tokenAddress: string
) => {
  try {
    const web3 = getWalletProvider();
    const bridgeManagerAddress =
      chainId === 1
        ? tokenAddress === "0x0000000000000000000000000000000000000000"
          ? BridgeManagerAddressForNative
          : BridgeManagerAddress
        : BridgeManagerAddress; // For now, only ETH bridge is available

    const bridgeManagerContract = new web3.eth.Contract(
      tokenAddress === "0x0000000000000000000000000000000000000000"
        ? (BridgeManagerABIForNative as unknown as AbiItem[])
        : (BridgeManagerABI as unknown as AbiItem[]),
      bridgeManagerAddress
    );

    return {
      web3,
      bridgeManagerContract,
      bridgeManagerAddress,
    };
  } catch (error) {
    console.error("Failed to initialize BridgeManager:", error);
    throw new Error("BridgeManager initialization failed");
  }
};

/**
 * Check if token approval is needed
 */
export const checkTokenApproval = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  chainId: number,
  userAddress: string
): Promise<boolean> => {
  try {
    const web3 = getWeb3ForChain(chainId);

    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    const allowance = await tokenContract.methods
      .allowance(userAddress, spenderAddress)
      .call();
    const requiredAmount = BigInt(amount);
    const currentAllowance = BigInt(String(allowance));

    return currentAllowance < requiredAmount;
  } catch (error) {
    console.error("Error checking token approval:", error);
    throw error;
  }
};

/**
 * Get gas estimate for any transaction
 */
export const getTransactionGasEstimate = async (
  contract: any,
  methodName: string,
  methodParams: any[],
  userAddress: string,
  fallbackGasLimit: number = 100000
): Promise<number> => {
  try {
    const gasEstimate = await contract.methods[methodName](
      ...methodParams
    ).estimateGas({ from: userAddress });

    return Number(gasEstimate);
  } catch (error: any) {
    return fallbackGasLimit;
  }
};

/**
 * Get gas estimate for token approval
 */
export const getGasEstimate = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  userAddress: string,
  chainId: number
): Promise<number> => {
  try {
    const web3 = getWalletProvider();

    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    // Try to get gas estimate
    const gasEstimate = await tokenContract.methods
      .approve(spenderAddress, amount)
      .estimateGas({ from: userAddress });

    return Number(gasEstimate);
  } catch (error: any) {
    return 100000; // Use a conservative gas limit
  }
};

/**
 * Approve token for bridge contract
 */
export const approveToken = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  chainId: number,
  userAddress: string
): Promise<string> => {
  try {
    const web3 = getWalletProvider();

    const tokenContract = new web3.eth.Contract(
      ERC20ABI as unknown as AbiItem[],
      tokenAddress
    );

    // Validate amount format
    if (!amount || amount === "0" || amount === "0x0") {
      throw new Error("Invalid approval amount");
    }

    // Check current allowance
    const allowance = await tokenContract.methods
      .allowance(userAddress, spenderAddress)
      .call();
    const requiredAmount = BigInt(amount);
    const currentAllowance = BigInt(String(allowance));

    // Check if this is USDT on Ethereum (chainId 1)
    const isUSDTOnEthereum =
      chainId === 1 &&
      tokenAddress.toLowerCase() ===
        "0xdac17f958d2ee523a2206206994597c13d831ec7";

    if (isUSDTOnEthereum) {
      // For USDT on Ethereum, check if there's already an allowance
      if (currentAllowance > BigInt(0)) {
        // USDT requires resetting allowance to 0 before setting a new one
        throw new Error(
          "There is problem with the token unlock. Try to revoke previous approval if any on https://revoke.cash and try again"
        );
      }
    } else {
      // For other tokens, check if current allowance is sufficient
      if (currentAllowance >= requiredAmount) {
        return "0x"; // Return dummy hash for already approved
      }
    }

    // Execute approval transaction
    const tx = await tokenContract.methods
      .approve(spenderAddress, amount)
      .send({
        from: userAddress,
        // gas: Math.floor(gasEstimate * 1.2).toString(), // Add 20% buffer
      });

    const txHash = await waitForTransaction(tx.transactionHash, chainId);

    return txHash;
  } catch (error: any) {
    console.error("Error approving token:", error);
    throw error;
  }
};

/**
 * Bridge tokens using wrapAndRelayTokens function
 */
export const bridgeTokens = async (params: BridgeParams): Promise<string> => {
  const { tokenAddress, amount, receiver, chainId } = params;

  try {
    const { web3, bridgeManagerContract } = initializeBridgeManager(
      chainId,
      tokenAddress
    );

    // Get the current account
    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];

    // Call wrapAndRelayTokens function
    // We'll use the version with receiver parameter
    const tx = await bridgeManagerContract.methods
      .wrapAndRelayTokens(receiver)
      .send({
        from: account,
        value: amount, // For native tokens (ETH)
      });

    const txHash = await waitForTransaction(tx.transactionHash, chainId);
    return txHash;
  } catch (error) {
    console.error("Error bridging tokens:", error);
    throw error;
  }
};

/**
 * Bridge ERC20 tokens (non-native tokens) - without approval handling
 */
export const bridgeERC20Tokens = async (
  params: BridgeParams
): Promise<string> => {
  const { tokenAddress, amount, receiver, chainId } = params;

  try {
    const { web3, bridgeManagerContract } = initializeBridgeManager(
      chainId,
      tokenAddress
    );

    // Get the current account
    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];

    // Bridge the tokens using relayTokens method
    const tx = await bridgeManagerContract.methods
      .relayTokens(tokenAddress, receiver, amount)
      .send({
        from: account,
      });

    const txHash = await waitForTransaction(tx.transactionHash, chainId);
    return txHash;
  } catch (error) {
    console.error("Error bridging ERC20 tokens:", error);
    throw error;
  }
};

/**
 * Check if approval is needed and handle the approval process
 */
export const handleTokenApproval = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  chainId: number,
  userAddress: string,
  onApprovalStart?: () => void,
  onApprovalComplete?: (txHash: string) => void,
  onApprovalError?: (error: any) => void
): Promise<boolean> => {
  try {
    // Check if approval is needed
    const needsApproval = await checkTokenApproval(
      tokenAddress,
      spenderAddress,
      amount,
      chainId,
      userAddress
    );

    if (needsApproval) {
      // Call approval start callback
      if (onApprovalStart) {
        onApprovalStart();
      }

      try {
        // Approve the token
        const approvalTxHash = await approveToken(
          tokenAddress,
          spenderAddress,
          amount,
          chainId,
          userAddress
        );

        // Call approval complete callback
        if (onApprovalComplete) {
          onApprovalComplete(approvalTxHash);
        }

        // Wait a bit for the approval transaction to be mined
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return true; // Approval was performed
      } catch (error) {
        console.error("Token approval failed:", error);

        // Call approval error callback
        if (onApprovalError) {
          onApprovalError(error);
        }

        throw error; // Re-throw to be handled by the caller
      }
    }

    return false; // No approval needed
  } catch (error) {
    console.error("Error handling token approval:", error);
    throw error;
  }
};

/**
 * Get transaction receipt
 */
export const getTransactionReceipt = async (
  txHash: string,
  chainId: number
): Promise<any> => {
  try {
    const web3 = getWeb3ForChain(chainId);
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    return receipt;
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
  chainId: number,
  confirmations: number = 1
): Promise<string> => {
  try {
    // In web3 v4, we need to poll for transaction receipt
    let receipt = null;
    while (!receipt) {
      receipt = await getTransactionReceipt(txHash, chainId);
      if (!receipt) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    console.log("Transaction confirmed:", txHash);
    return txHash; // Return the transaction hash, not the receipt
  } catch (error) {
    console.error("Failed to wait for transaction:", error);
    throw new Error("Transaction confirmation failed");
  }
};
