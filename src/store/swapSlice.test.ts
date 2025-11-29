import { describe, expect, it, vi } from "vitest";
import reducer, {
  applyQuoteIfCurrent,
  compareQuotes,
  getTokenBalancesBatch,
  updateBestQuote,
  getQuote,
} from "./swapSlice";
import { QuoteType, TokenType } from "../types/Swap";
import { ZeroAddress } from "../const/swap";

vi.mock("../utils/quoteValidation", () => ({
  validateQuoteIntegrity: (quote: QuoteType) => ({
    decodedRoute: {
      tokenIn: quote.tokenInAddress,
      tokenOut: quote.tokenOutAddress,
      amountIn: quote.amountIn ?? "1000000000000000000",
      minAmountOut: quote.minAmountOut,
      deadline: quote.deadline,
      destination: ZeroAddress,
      isETHOut: false,
    },
    uiMinAmountOut: quote.minAmountOut,
    checkedAt: Date.now(),
  }),
}));

const initState = reducer(undefined, { type: "init" }) as any;

const makeQuote = (overrides: Partial<QuoteType> = {}): QuoteType => ({
  calldata: "0x",
  tokenInAddress: "0x1",
  tokenOutAddress: "0x2",
  amountIn: "100",
  minAmountOut: "90",
  outputAmount: "100",
  deadline: 1,
  gasUSDEstimated: 1,
  route: [],
  integrity: {
    payload: {
      version: 1,
      router: "0xrouter",
      tokenIn: "0x1",
      tokenOut: "0x2",
      amountIn: "100",
      minAmountOut: "90",
      deadline: 1,
      calldataHash: "0x0",
      issuedAt: 1,
      slippageBps: 50,
    },
    signature: "0xsign",
    signer: "0xsigner",
  },
  ...overrides,
});

describe("swapSlice token balance updates", () => {
  it("stores balances only for the matching request/account", () => {
    const pending = reducer(initState, {
      type: getTokenBalancesBatch.pending.type,
      meta: { requestId: "req-1", arg: { account: "0xabc", tokens: [] } },
    } as any);

    const fulfilled = reducer(pending, {
      type: getTokenBalancesBatch.fulfilled.type,
      payload: { balances: { "0x1": "10" }, account: "0xabc" },
      meta: { requestId: "req-1", arg: { account: "0xabc", tokens: [] } },
    } as any);

    expect(fulfilled.tokenBalances["0x1"]).toEqual("10");
    expect(fulfilled.isTokenBalancesLoading).toBe(false);

    const stale = reducer(fulfilled, {
      type: getTokenBalancesBatch.fulfilled.type,
      payload: { balances: { "0x2": "20" }, account: "0xdef" },
      meta: { requestId: "req-other", arg: { account: "0xdef", tokens: [] } },
    } as any);

    expect(stale.tokenBalances["0x2"]).toBeUndefined();
  });
});

const baseState = {
  swap: {
    fromToken: { address: "0x1", decimals: 18 } as TokenType,
    toToken: { address: "0x2", decimals: 18 } as TokenType,
    fromAmount: "1",
    slippage: 0.5,
  },
  referral: {
    referralAddress: null,
  },
} as any;

const makeThunkDispatch = (handlers: {
  pulsex: () => Promise<QuoteType>;
  piteas: () => Promise<QuoteType>;
}) => {
  const actions: any[] = [];
  const queue = [handlers.pulsex, handlers.piteas];

  const dispatch = (action: any) => {
    if (typeof action === "function") {
      const handler = queue.shift();
      if (!handler) {
        return { unwrap: async () => { throw new Error("Unexpected thunk"); } };
      }
      return { unwrap: handler };
    }
    actions.push(action);
    return action;
  };

  return { dispatch: dispatch as any, actions };
};

describe("compareQuotes", () => {
  it("prefers higher outputAmount", () => {
    const a = makeQuote({ outputAmount: "200" });
    const b = makeQuote({ outputAmount: "150" });
    expect(compareQuotes(a, b)).toBe("a");
    expect(compareQuotes(b, a)).toBe("b");
  });

  it("prefers higher minAmountOut when outputs match", () => {
    const a = makeQuote({ minAmountOut: "95", outputAmount: "200" });
    const b = makeQuote({ minAmountOut: "90", outputAmount: "200" });
    expect(compareQuotes(a, b)).toBe("a");
  });

  it("returns tie when values are equal or gas missing", () => {
    const a = makeQuote({ gasUSDEstimated: Number.NaN });
    const b = makeQuote({ gasUSDEstimated: Number.NaN });
    expect(compareQuotes(a, b)).toBe("tie");
  });

  it("returns tie when output and minOut are identical", () => {
    const a = makeQuote({ outputAmount: "1000", minAmountOut: "900" });
    const b = makeQuote({ outputAmount: "1000", minAmountOut: "900" });
    expect(compareQuotes(a, b)).toBe("tie");
  });
});

describe("updateBestQuote", () => {
  it("prefers the new quote when it is better", () => {
    const current = { quote: makeQuote({ outputAmount: "100" }), source: "pulsex" as const };
    const candidate = makeQuote({ outputAmount: "150" });
    const result = updateBestQuote(current, candidate, "piteas");
    expect(result.quote).toBe(candidate);
    expect(result.source).toBe("piteas");
  });

  it("keeps the current quote on tie", () => {
    const current = { quote: makeQuote({ outputAmount: "100", minAmountOut: "90" }), source: "pulsex" as const };
    const candidate = makeQuote({ outputAmount: "100", minAmountOut: "90" });
    const result = updateBestQuote(current, candidate, "piteas");
    expect(result.quote).toBe(current.quote);
    expect(result.source).toBe("pulsex");
  });
});

describe("applyQuoteIfCurrent", () => {
  const baseToken = { address: "0x1", decimals: 18 } as TokenType;
  const destToken = { address: "0x2", decimals: 18 } as TokenType;
  const snapshot = {
    tokenInAddress: "0x1",
    tokenOutAddress: "0x2",
    amount: "1",
    allowedSlippage: 0.5,
    fromDecimal: 18,
  };

  it("applies quote and source when snapshot matches", () => {
    const state = {
      ...initState,
      fromToken: baseToken,
      toToken: destToken,
      fromAmount: "1",
      slippage: 0.5,
    };

    const quote = makeQuote({
      tokenInAddress: "0x1",
      tokenOutAddress: "0x2",
      outputAmount: "200",
    });

    const next = reducer(
      state,
      applyQuoteIfCurrent({ quote, params: snapshot, source: "pulsex" })
    );

    expect(next.quote).toBe(quote);
    expect(next.quoteSource).toBe("pulsex");
  });

  it("ignores stale snapshot", () => {
    const state = {
      ...initState,
      fromToken: baseToken,
      toToken: destToken,
      fromAmount: "2",
      slippage: 0.5,
    };

    const quote = makeQuote({
      tokenInAddress: "0x1",
      tokenOutAddress: "0x2",
      outputAmount: "200",
    });

    const next = reducer(
      state,
      applyQuoteIfCurrent({ quote, params: snapshot, source: "piteas" })
    );

    expect(next.quote).toBeNull();
    expect(next.quoteSource).toBeNull();
  });
});

describe("getQuote parallel flow", () => {
  const args = {
    tokenInAddress: "0x1",
    tokenOutAddress: "0x2",
    amount: "1",
    allowedSlippage: 0.5,
    fromDecimal: 18,
    account: "0xabc",
  };

  it("selects PulseX when it has the better quote", async () => {
    const pulseQuote = makeQuote({ outputAmount: "200", minAmountOut: "180" });
    const piteasQuote = makeQuote({ outputAmount: "150", minAmountOut: "140" });

    const { dispatch, actions } = makeThunkDispatch({
      pulsex: async () => pulseQuote,
      piteas: async () => piteasQuote,
    });

    const thunk = getQuote(args);
    const result = await thunk(dispatch, () => baseState, undefined as any);

    expect(result.type).toBe("swap/getQuote/fulfilled");
    expect(result.payload?.outputAmount).toBe(pulseQuote.outputAmount);
    const applied = actions.find((a) => a.type === "swap/applyQuoteIfCurrent");
    expect(applied?.payload.source).toBe("pulsex");
  });

  it("selects Piteas when it has the better quote", async () => {
    const pulseQuote = makeQuote({ outputAmount: "150", minAmountOut: "140" });
    const piteasQuote = makeQuote({ outputAmount: "200", minAmountOut: "180" });

    const { dispatch, actions } = makeThunkDispatch({
      pulsex: async () => pulseQuote,
      piteas: async () => piteasQuote,
    });

    const thunk = getQuote(args);
    const result = await thunk(dispatch, () => baseState, undefined as any);

    expect(result.type).toBe("swap/getQuote/fulfilled");
    expect(result.payload?.outputAmount).toBe(piteasQuote.outputAmount);
    const applied = actions.filter((a) => a.type === "swap/applyQuoteIfCurrent").pop();
    expect(applied?.payload.source).toBe("piteas");
  });

  it("keeps the first quote on tie", async () => {
    const pulseQuote = makeQuote({ outputAmount: "180", minAmountOut: "160" });
    const piteasQuote = makeQuote({ outputAmount: "180", minAmountOut: "160" });

    const { dispatch, actions } = makeThunkDispatch({
      pulsex: async () => pulseQuote,
      piteas: async () => piteasQuote,
    });

    const thunk = getQuote(args);
    const result = await thunk(dispatch, () => baseState, undefined as any);

    expect(result.type).toBe("swap/getQuote/fulfilled");
    expect(result.payload?.outputAmount).toBe(pulseQuote.outputAmount);
    const applied = actions.find((a) => a.type === "swap/applyQuoteIfCurrent");
    expect(applied?.payload.source).toBe("pulsex");
  });

  it("returns the successful quote if the other provider fails", async () => {
    const pulseQuote = makeQuote({ outputAmount: "190", minAmountOut: "170" });

    const { dispatch, actions } = makeThunkDispatch({
      pulsex: async () => pulseQuote,
      piteas: async () => Promise.reject(new Error("fail")),
    });

    const thunk = getQuote(args);
    const result = await thunk(dispatch, () => baseState, undefined as any);

    expect(result.type).toBe("swap/getQuote/fulfilled");
    expect(result.payload?.outputAmount).toBe(pulseQuote.outputAmount);
    const applied = actions.find((a) => a.type === "swap/applyQuoteIfCurrent");
    expect(applied?.payload.source).toBe("pulsex");
  });
});
