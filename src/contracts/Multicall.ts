import Web3 from "web3";
import { AbiItem } from "web3-utils";
import MulticallArtifact from "../abis/Multicall.json";
import { MulticallAddress, ZeroAddress } from "../const/swap";
import { TokenType } from "../types/Swap";
import { getPulsechainWeb3 } from "../rpc/pulsechainProviders";

const MulticallContractABI = MulticallArtifact as unknown as AbiItem[];

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

const BALANCE_OF_ABI = {
  name: "balanceOf",
  type: "function",
  inputs: [{ name: "account", type: "address" }],
};

const getWeb3 = () => getPulsechainWeb3();

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

const buildBalanceOfCall = (web3: Web3, tokenAddress: string, account: string): MulticallCall => {
  const callData = web3.eth.abi.encodeFunctionCall(BALANCE_OF_ABI as any, [account]);
  const isNative = tokenAddress.toLowerCase() === ZeroAddress.toLowerCase();

  return {
    target: isNative ? ZeroAddress : tokenAddress,
    callData,
  };
};

export const multicall = async (
  calls: MulticallCall[]
): Promise<MulticallResult[]> => {
  const { multicallContract } = initializeMulticall();
  return multicallContract.methods.multicall(calls).call();
};

/**
 * Batch fetch raw token balances (base units) for an account.
 */
export const getTokenBalances = async (
  params: GetTokenBalancesParams
): Promise<string[]> => {
  const { tokens, account } = params;
  const { web3 } = initializeMulticall();

  const calls = tokens.map((token) => buildBalanceOfCall(web3, token.address, account));
  const results = await multicall(calls);

  return results.map((result) => {
    if (!result.success || !result.returnData) {
      return "0";
    }

    try {
      const decoded = web3.eth.abi.decodeParameter("uint256", result.returnData) as string;
      return decoded.toString();
    } catch (error) {
      console.error("Failed to decode balance:", error);
      return "0";
    }
  });
};

export const createMulticall = () => {
  const instance = initializeMulticall();

  return {
    instance,
    multicall: (calls: MulticallCall[]) => multicall(calls),
    getTokenBalances: (params: GetTokenBalancesParams) => getTokenBalances(params),
    getWeb3: () => instance.web3,
    getMulticallContract: () => instance.multicallContract,
  };
};
