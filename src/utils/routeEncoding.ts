import { AbiCoder, ParamType } from "ethers";
import { QuoteRouteSummary, RouteType, RouteTokenType } from "../types/Swap";

export const toCorrectDexName = (dex: string): string => {
  if (dex === "PulseX V1") return "pulsexV1";
  if (dex === "PulseX V2") return "pulsexV2";
  if (dex === "9inch V2") return "9inchV2";
  if (dex === "9inch V3") return "9inchV3";
  if (dex === "9mm V3") return "9mmV3";
  if (dex === "9mm V2") return "9mmV2";
  if (dex === "Phux") return "phux";
  if (dex === "PulseX Stable") return "pulsexStable";
  if (dex === "pDex V3") return "pDexV3";
  if (dex.toLowerCase().includes("dextop")) return "dexTop";
  if (dex === "Tide") return "tide";
  return "";
};

export interface SwapStep {
  dex: string;
  path: string[];
  pool: string;
  percent: number;
  groupId: number;
  parentGroupId: number;
  userData: string;
}

export interface Group {
  id: number;
  percent: number;
}

export interface SwapRoute {
  steps: SwapStep[];
  parentGroups: Group[];
  destination: string;
  tokenIn: string;
  tokenOut: string;
  groupCount: number;
  deadline: number;
  amountIn: string;
  amountOutMin: string;
  isETHOut: boolean;
}

export interface PathToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

export interface PathInfo {
  percent: number;
  address: string;
  exchange: string;
}

export interface Subswap {
  percent: number;
  paths: PathInfo[];
}

export interface Swap {
  percent: number;
  subswaps: Subswap[];
}

export interface Route {
  paths: PathToken[][];
  swaps: Swap[];
}

const SWAP_ROUTE_ABI = [
  ParamType.from({
    name: "SwapRoute",
    type: "tuple",
    components: [
      {
        name: "steps",
        type: "tuple[]",
        components: [
          { name: "dex", type: "string" },
          { name: "path", type: "address[]" },
          { name: "pool", type: "address" },
          { name: "percent", type: "uint256" },
          { name: "groupId", type: "uint256" },
          { name: "parentGroupId", type: "uint256" },
          { name: "userData", type: "bytes" },
        ],
      },
      {
        name: "parentGroups",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "percent", type: "uint256" },
        ],
      },
      { name: "destination", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "groupCount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "isETHOut", type: "bool" },
    ],
  }),
];

const abiCoder = new AbiCoder();

export const encodeSwapRoute = (route: SwapRoute): string =>
  abiCoder.encode(SWAP_ROUTE_ABI, [route]);

export const decodeSwapRouteSummary = (calldata: string): QuoteRouteSummary => {
  if (!calldata || typeof calldata !== "string") {
    throw new Error("Cannot decode empty calldata");
  }

  const [route] = abiCoder.decode(SWAP_ROUTE_ABI, calldata) as [
    {
      tokenIn: string;
      tokenOut: string;
      amountIn: bigint;
      amountOutMin: bigint;
      deadline: bigint;
      destination: string;
      isETHOut: boolean;
    }
  ];

  return {
    tokenIn: route.tokenIn,
    tokenOut: route.tokenOut,
    amountIn: route.amountIn.toString(),
    minAmountOut: route.amountOutMin.toString(),
    deadline: Number(route.deadline),
    destination: route.destination,
    isETHOut: Boolean(route.isETHOut),
  };
};

export const combineRoute = (route: Route): RouteType[] =>
  route.swaps.map((swap, swapIdx) => ({
    percent: swap.percent / 1000,
    subroutes: swap.subswaps.map((subswap, subswapIdx) => ({
      percent: subswap.percent / 1000,
      paths: subswap.paths.map((path) => {
        const pathTokens = route.paths[swapIdx] ?? [];
        const tokenStart = pathTokens[subswapIdx];
        const tokenEnd = pathTokens[subswapIdx + 1];
        const tokens: RouteTokenType[] = [];
        if (tokenStart) tokens.push(tokenStart);
        if (tokenEnd) tokens.push(tokenEnd);

        const { address, percent, ...rest } = path;

        return {
          ...rest,
          percent: percent / 1000,
          tokens,
        };
      }),
    })),
  }));
