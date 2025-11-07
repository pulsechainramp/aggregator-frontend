import { BackendURL } from "../const/swap";
import { QuoteType } from "../types/Swap";

type QuoteClientParams = {
  tokenInAddress: string;
  tokenOutAddress: string;
  amount: string;
  allowedSlippage: number;
  account?: string;
};

const buildQuoteUrl = ({
  tokenInAddress,
  tokenOutAddress,
  amount,
  allowedSlippage,
  account,
}: QuoteClientParams): string => {
  const url = new URL("quote", BackendURL);
  url.searchParams.set("tokenInAddress", tokenInAddress);
  url.searchParams.set("tokenOutAddress", tokenOutAddress);
  url.searchParams.set("amount", amount);
  url.searchParams.set("allowedSlippage", allowedSlippage.toString());

  if (account) {
    url.searchParams.set("account", account);
  }

  return url.toString();
};

const assertIntegrity = (payload: unknown): asserts payload is QuoteType => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("integrity" in payload)
  ) {
    throw new Error("Quote payload is missing integrity metadata");
  }
};

export const fetchPiteasQuoteClient = async (
  params: QuoteClientParams
): Promise<QuoteType> => {
  const response = await fetch(buildQuoteUrl(params), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Quote request failed (${response.status})`);
  }

  const payload = await response.json();
  assertIntegrity(payload);

  return payload;
};
