import Web3 from "web3";
import { AbiItem } from "web3-utils";
import AffiliateRouterArtifact from "../abis/AffiliateRouter.json";
import ERC20ABI from "../abis/ERC20.json";
import { QuoteType, TokenType } from "../types/Swap";
import { PulseChainConfig } from "../config/chainConfig";
import { AffiliateRouterAddress } from "../const/swap";
import { BigNumberish, ethers, ZeroAddress } from "ethers";
import { getPulsechainWeb3 } from "../rpc/pulsechainProviders";

const RECEIPT_POLL_INTERVAL_MS = 1000;
const DEFAULT_RECEIPT_TIMEOUT_MS = 120_000;
const coerceTimeout = (raw: unknown, fallback: number) => {
  const parsed = typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const RECEIPT_TIMEOUT_MS = coerceTimeout(
  (import.meta as any)?.env?.VITE_TX_RECEIPT_TIMEOUT_MS,
  DEFAULT_RECEIPT_TIMEOUT_MS
);

const AffiliateRouterABI =
  (AffiliateRouterArtifact as { abi: AbiItem[] }).abi ||
  (AffiliateRouterArtifact as unknown as AbiItem[]);

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

export interface ReferralPromoData {
  firstReferrer: string | null;
  boundAt: bigint;
  promoBps: number;
  promoRemaining: number;
}

export interface ReferralConstants {
  maxPromoBps: number;
  tailBps: number;
  defaultReferrer: string | null;
  defaultReferrerBps: number | null;
}

export const getWeb3 = () => getPulsechainWeb3();

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildReceiptProviders = (): Web3[] => {
  const providers: Web3[] = [];
  try {
    providers.push(getProvider());
  } catch {
    // Wallet provider not available (not connected) - fall back to public RPC
  }
  providers.push(getWeb3());
  return providers;
};

const tryGetReceipt = async (
  txHash: string,
  providers: Web3[]
): Promise<any | null> => {
  let lastError: unknown;
  let sawNotFound = false;
  let sawTransient = false;

  for (const web3 of providers) {
    try {
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      if (receipt) {
        return receipt;
      }
      sawNotFound = true;
    } catch (error: any) {
      const message = error?.message ?? "";
      const isNotFound =
        typeof message === "string" &&
        (message.includes("Transaction not found") ||
          message.includes("not found"));
      const isTransient =
        typeof message === "string" &&
        (/network|timeout|Failed to fetch|cooling down|429|502|503|504/i.test(message) ||
          error?.code === "RPC_COOLDOWN");
      if (isNotFound) {
        sawNotFound = true;
        continue;
      }
      if (isTransient) {
        sawTransient = true;
        continue;
      }
      if (!lastError) {
        console.warn("getTransactionReceipt failed on provider", {
          provider: (web3 as any)?._provider ?? "custom",
          error,
        });
      }
      lastError = error;
    }
  }

  if (lastError && !sawNotFound && !sawTransient) {
    throw lastError;
  }

  if (lastError) {
    console.warn("Transaction receipt lookup encountered errors", {
      txHash,
      error: lastError,
    });
  }

  return null;
};

/**
 * Initialize SwapManager instance
 */
export const initializeSwapManager = () => {
  try {
    const web3 = getProvider();
    const swapManagerContract = new web3.eth.Contract(
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
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
  decimals: number,
  providerOverride?: Web3
): Promise<string> => {
  try {
    // Native tokens don't need allowance
    if (isNativeToken(tokenAddress)) {
      return "0";
    }

    const web3 = providerOverride ?? getWeb3(); // Prefer override (wallet) if provided
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
  decimals: number,
  chainId?: number
): Promise<boolean> => {
  try {
    // Native tokens don't need approval
    if (isNativeToken(tokenAddress)) {
      return false;
    }

    const requiredAllowanceWei = ethers.parseUnits(amount, decimals);

    const providers: Web3[] = [];
    try {
      providers.push(getProvider());
    } catch {
      // wallet provider unavailable; rely on public RPC
    }
    providers.push(getWeb3());

    let checked = false;
    let lastError: unknown;

    for (const provider of providers) {
      try {
        if (typeof chainId === "number") {
          const providerChainId = await provider.eth
            .getChainId()
            .then((id) => Number(id))
            .catch(() => NaN);
          if (!Number.isFinite(providerChainId) || providerChainId !== chainId) {
            continue;
          }
        }

        const allowance: string = await getTokenAllowance(
          tokenAddress,
          owner,
          spender,
          decimals,
          provider
        );
        checked = true;
        if (BigInt(allowance) >= requiredAllowanceWei) {
          return true;
        }
      } catch (error) {
        lastError = error;
        console.warn("needsApproval allowance check failed on provider", error);
      }
    }

    // If no provider check succeeded, fail so caller can retry or show error
    if (!checked) {
      throw lastError ?? new Error("Allowance check failed");
    }

    return false;
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

    const amountInWei = ethers.parseUnits(params.amount, params.decimals);

    // Execute approval transaction
    const transaction = await tokenContract.methods
      .approve(params.spenderAddress, amountInWei)
      .send({
        from: params.account,
      });

    try {
      await waitForTransaction(transaction.transactionHash, 1);
    } catch (err: any) {
      const message = err?.message ?? "";
      const timedOut = typeof message === "string" && message.includes("Timed out");
      if (timedOut) {
        // If we timed out waiting for the receipt, re-check allowance; if sufficient, treat as success.
        let walletWeb3: Web3 | undefined;
        try {
          walletWeb3 = getProvider();
        } catch {
          walletWeb3 = undefined;
        }
        try {
          const allowance = await getTokenAllowance(
            params.tokenAddress,
            params.account,
            params.spenderAddress,
            params.decimals,
            walletWeb3
          );
          if (BigInt(allowance) >= amountInWei) {
            return {
              transactionHash: transaction.transactionHash,
              blockNumber: Number(transaction.blockNumber ?? 0),
            };
          }
        } catch (allowErr) {
          console.warn("Allowance re-check failed after timeout", allowErr);
        }
      }
      throw err;
    }

    return {
      transactionHash: transaction.transactionHash,
      blockNumber: Number(transaction.blockNumber ?? 0),
    };
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
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
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

    // Execute swap transaction with referral code
    const transaction = await swapManagerContract.methods
      .executeSwap(quote.calldata, referrerCode)
      .send(txParams);

    try {
      await waitForTransaction(transaction.transactionHash, {
        minConfirmations: 1,
        allowUnconfirmed: false,
      });
    } catch (err: any) {
      if (err?.code === "RECEIPT_TIMEOUT") {
        throw new Error("Swap transaction timed out waiting for confirmation");
      }
      throw err;
    }

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
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
    );
    // Execute fee basis points update transaction
    const transaction = await swapManagerContract.methods
      .updateFeeBasisPoints(newFeeBasisPoints)
      .send({ from: account });

    await waitForTransaction(transaction.transactionHash, {
      minConfirmations: 1,
      allowUnconfirmed: false,
    });

    return {
      transactionHash: transaction.transactionHash,
      blockNumber: Number(transaction.blockNumber ?? 0),
    };
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
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
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

export const getReferralPromo = async (
  userAddress: string
): Promise<ReferralPromoData> => {
  try {
    const web3 = getWeb3();
    const swapManagerContract = new web3.eth.Contract(
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
    );

    const promo = await swapManagerContract.methods
      .referral(userAddress)
      .call();

    const rawFirstReferrer = promo.firstReferrer as string;
    const firstReferrer =
      rawFirstReferrer &&
      rawFirstReferrer.toLowerCase() !== ethers.ZeroAddress.toLowerCase()
        ? rawFirstReferrer
        : null;

    return {
      firstReferrer,
      boundAt: BigInt(promo.boundAt ?? 0),
      promoBps: Number(promo.promoBps ?? 0),
      promoRemaining: Number(promo.promoRemaining ?? 0),
    };
  } catch (error) {
    console.error("Failed to fetch referral promo:", error);
    throw new Error("Failed to fetch referral promo");
  }
};

export const getPromoConstants = async (): Promise<ReferralConstants> => {
  try {
    const web3 = getWeb3();
    const swapManagerContract = new web3.eth.Contract(
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
    );

    const [
      maxPromoBps,
      tailBps,
      defaultReferrer,
      defaultReferrerBasisPoints,
    ] = await Promise.all([
      swapManagerContract.methods.maxPromoBps().call(),
      swapManagerContract.methods.tailBps().call(),
      swapManagerContract.methods.defaultReferrer().call(),
      swapManagerContract.methods.defaultReferrerBasisPoints().call(),
    ]);

    return {
      maxPromoBps: Number(maxPromoBps),
      tailBps: Number(tailBps),
      defaultReferrer:
        defaultReferrer &&
        defaultReferrer.toLowerCase() !== ethers.ZeroAddress.toLowerCase()
          ? defaultReferrer
          : null,
      defaultReferrerBps: Number(defaultReferrerBasisPoints ?? 0),
    };
  } catch (error) {
    console.error("Failed to fetch promo constants:", error);
    throw new Error("Failed to fetch promo constants");
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
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
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

export const getReferralCreationFee = async (): Promise<string> => {
  try {
    const web3 = getWeb3();
    const swapManagerContract = new web3.eth.Contract(
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
    );

    const fee: string = await swapManagerContract.methods
      .referralCreationFee()
      .call();

    return fee.toString();
  } catch (error) {
    console.error("Failed to fetch referral creation fee:", error);
    throw new Error("Failed to fetch referral creation fee");
  }
};

export const hasPaidReferralCreationFee = async (
  address: string
): Promise<boolean> => {
  try {
    const web3 = getWeb3();
    const swapManagerContract = new web3.eth.Contract(
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
    );

    const result: boolean = await swapManagerContract.methods
      .hasPaidReferralCreationFee(address)
      .call();

    return Boolean(result);
  } catch (error) {
    console.error("Failed to check referral creation fee status:", error);
    throw new Error("Failed to check referral creation fee status");
  }
};

export const payReferralCreationFee = async (params: {
  account: string;
  value: string;
}) => {
  try {
    const { swapManagerContract } = initializeSwapManager();

    const transaction = await swapManagerContract.methods
      .payReferralCreationFee()
      .send({ from: params.account, value: params.value });

    return {
      transactionHash: transaction.transactionHash,
      blockNumber: Number(transaction.blockNumber ?? 0),
    };
  } catch (error) {
    console.error("Referral creation fee payment failed:", error);
    throw new Error("Referral creation fee payment failed");
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
      AffiliateRouterABI as unknown as AbiItem[],
      AffiliateRouterAddress
    );

    // Execute referral earnings withdrawal
    const transaction = await swapManagerContract.methods
      .withdrawReferralEarnings(tokens)
      .send({ from: account });

    try {
      await waitForTransaction(transaction.transactionHash, {
        minConfirmations: 1,
        allowUnconfirmed: false,
      });
    } catch (err: any) {
      if (err?.code === "RECEIPT_TIMEOUT") {
        throw new Error("Referral earnings withdrawal timed out waiting for confirmation");
      }
      throw err;
    }

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
    const providers = buildReceiptProviders();
    return await tryGetReceipt(txHash, providers);
  } catch (error: any) {
    console.error("Failed to get transaction receipt:", error);
    throw new Error("Failed to fetch transaction receipt");
  }
};

export interface WaitForTransactionOptions {
  minConfirmations?: number;
  timeoutMs?: number;
  allowUnconfirmed?: boolean;
}

/**
 * Wait for transaction confirmation
 */
export const waitForTransaction = async (
  txHash: string,
  confirmationsOrOptions: number | WaitForTransactionOptions = 1
): Promise<any> => {
  const opts =
    typeof confirmationsOrOptions === "number"
      ? { minConfirmations: confirmationsOrOptions }
      : confirmationsOrOptions;

  const minConfirmations = Math.max(1, opts.minConfirmations ?? 1);
  const timeoutMs = opts.timeoutMs ?? RECEIPT_TIMEOUT_MS;
  const allowUnconfirmed = opts.allowUnconfirmed ?? false;

  try {
    console.log("Waiting for transaction:", txHash);
    const providers = buildReceiptProviders();
    const timeoutAt = Date.now() + timeoutMs;

    while (Date.now() < timeoutAt) {
      const receipt = await tryGetReceipt(txHash, providers);
      if (receipt) {
        if (receipt.status === false || receipt.status === "0x0" || receipt.status === 0) {
          throw new Error("Transaction reverted");
        }
        if (minConfirmations <= 1 || !receipt.blockNumber) {
          return receipt;
        }

        const receiptBlock =
          typeof receipt.blockNumber === "string"
            ? Number(receipt.blockNumber)
            : Number(receipt.blockNumber ?? NaN);

        let latestBlock: number | null = null;
        try {
          latestBlock = await providers[0].eth.getBlockNumber();
        } catch (error) {
          console.warn("Failed to fetch latest block for confirmations", error);
        }

        if (
          Number.isFinite(receiptBlock) &&
          Number.isFinite(latestBlock) &&
          latestBlock !== null &&
          latestBlock - receiptBlock + 1 >= minConfirmations
        ) {
          return receipt;
        }
      }
      await sleep(RECEIPT_POLL_INTERVAL_MS);
    }

    const finalReceipt = allowUnconfirmed ? await tryGetReceipt(txHash, providers) : null;
    if (finalReceipt) {
      if (finalReceipt.status === false || finalReceipt.status === "0x0" || finalReceipt.status === 0) {
        throw new Error("Transaction reverted");
      }
      return finalReceipt;
    }

    const timeoutError: any = new Error("Timed out waiting for transaction confirmation");
    timeoutError.code = "RECEIPT_TIMEOUT";
    throw timeoutError;
  } catch (error) {
    console.error("Failed to wait for transaction:", error);
    if (error instanceof Error) {
      throw error;
    }
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
      decimals: number,
      chainId?: number
    ) => needsApproval(tokenAddress, owner, spender, amount, decimals, chainId),

    approveToken: (params: ApprovalParams) => approveToken(params),

    executeSwap: (params: SwapParams) => executeSwap(params),

    withdrawReferralEarnings: (params: ReferralClaimParams) =>
      withdrawReferralEarnings(params),

    getFeeBasisPoints: (userAddress: string) => getFeeBasisPoints(userAddress),

    updateFeeBasisPoints: (params: UpdateFeeBasisPointsParams) =>
      updateFeeBasisPoints(params),

    getReferralPromo: (userAddress: string) => getReferralPromo(userAddress),

    getPromoConstants: () => getPromoConstants(),

    getReferrerEarnings: (referrerAddress: string, tokens: string[]) =>
      getReferrerEarnings(referrerAddress, tokens),

    getTokenDecimals: (tokenAddress: string) => getTokenDecimals(tokenAddress),

    getReferralCreationFee: () => getReferralCreationFee(),
    hasPaidReferralCreationFee: (address: string) => hasPaidReferralCreationFee(address),
    payReferralCreationFee: (params: { account: string; value: string }) =>
      payReferralCreationFee(params),

    // Utility functions
    getTransactionReceipt: (txHash: string) => getTransactionReceipt(txHash),

    waitForTransaction: (txHash: string, confirmations?: number) =>
      waitForTransaction(txHash, confirmations),

    // Getters
    getWeb3: () => instance.web3,
    getSwapManagerContract: () => instance.swapManagerContract,
  };
};
