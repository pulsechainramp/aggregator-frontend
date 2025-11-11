import Web3 from "web3";
import { AbiItem } from "web3-utils";
import MulticallArtifact from "../abis/Multicall.json";
import { MulticallAddress, ZeroAddress } from "../const/swap";
import { PulseChainConfig } from "../config/chainConfig";
import ERC20ABI from "../abis/ERC20.json";
import { TokenType } from "../types/Swap";
import { formatUnits } from "ethers";

const MulticallContractABI = MulticallArtifact as unknown as AbiItem[];
const ERC20ContractABI = ERC20ABI as unknown as AbiItem[];

export interface MulticallCall {
  target: string;
  callData: string;
}

export interface MulticallResult {
  success: boolean;
  returnData: string;
}

export interface GetTokenBalancesParams {
  tokens: TokenType[];
  account: string;
}

export const getWeb3 = () =>
  new Web3(
    PulseChainConfig.providerList[
      Math.floor(Math.random() * PulseChainConfig.providerList.length)
    ]
  );

export const isNativeToken = (tokenAddress: string): boolean => {
  return tokenAddress.toLowerCase() === ZeroAddress.toLowerCase();
};


export const initializeMulticall = () => {
  try {
    const web3 = getWeb3();
    const multicallContract = new web3.eth.Contract(
      MulticallContractABI as unknown as AbiItem[],
      MulticallAddress
    );

    return {
      web3,
      multicallContract,
    };
  } catch (error) {
    console.error("Failed to initialize Multicall:", error);
    throw new Error("Multicall initialization failed");
  }
};

export const multicall = async (
  calls: MulticallCall[]
): Promise<MulticallResult[]> => {
  try {
    const web3 = getWeb3(); // Use public RPC for read operations
    const multicallContract = new web3.eth.Contract(
      MulticallContractABI as unknown as AbiItem[],
      MulticallAddress
    );

    const results: MulticallResult[] = await multicallContract.methods
      .multicall(calls)
      .call();

    return results;
  } catch (error) {
    console.error("Multicall execution failed:", error);
    throw new Error("Multicall execution failed");
  }
};

/**
 * Helper function to create balanceOf calls for multiple tokens
 * Uses the multicall function to query token balances in a single call
 * @param params Object containing tokens array and account address
 * @returns Array of token balances formatted by token decimals (as numbers)
 */
export const getTokenBalances = async (
  params: GetTokenBalancesParams
): Promise<Number[]> => {
  try {
    const { tokens, account } = params;
    const web3 = getWeb3();

    // Build multicall calls for each token
    const calls: MulticallCall[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenAddress = token.address;

      if (isNativeToken(tokenAddress)) {
        // balanceOf(address) selector: 0x70a08231
        const encodedAccount = web3.eth.abi.encodeParameter("address", account);
        const callData = "0x70a08231" + encodedAccount.slice(2);
        
        calls.push({
          target: ZeroAddress,
          callData: callData,
        });
      } else {
        // For ERC20 tokens, create balanceOf call
        const tokenContract = new web3.eth.Contract(
          ERC20ContractABI as unknown as AbiItem[],
          tokenAddress
        );
        const callData = tokenContract.methods.balanceOf(account).encodeABI();

        calls.push({
          target: tokenAddress,
          callData: callData,
        });
      }
    }

    // Execute multicall
    const results = await multicall(calls);

    // Decode and format results by token decimals
    const balances: Number[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const token = tokens[i];
      
      if (result.success && result.returnData) {
        try {
          // Decode the uint256 balance from returnData
          const decoded = web3.eth.abi.decodeParameter(
            "uint256",
            result.returnData
          ) as string | bigint;
          
          // Format balance using token decimals
          const balanceWei = decoded.toString();
          const formattedBalance = Number(formatUnits(balanceWei, token.decimals));
          balances.push(formattedBalance);
        } catch (decodeError) {
          console.error(`Failed to decode balance for token ${token.address}:`, decodeError);
          balances.push(0);
        }
      } else {
        balances.push(0);
      }
    }

    return balances;
  } catch (error) {
    console.error("Failed to get token balances:", error);
    throw new Error("Failed to fetch token balances");
  }
};

export const createMulticall = () => {
  const instance = initializeMulticall();

  return {
    // Instance
    instance,

    // Helper functions
    isNativeToken,

    // Core functions
    multicall: (calls: MulticallCall[]) => multicall(calls),

    getTokenBalances: (params: GetTokenBalancesParams) =>
      getTokenBalances(params),

    // Getters
    getWeb3: () => instance.web3,
    getMulticallContract: () => instance.multicallContract,
  };
};
