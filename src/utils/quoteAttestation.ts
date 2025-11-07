import { BackendURL } from "../const/swap";
import { QuoteIntegrity, UnsignedQuoteType } from "../types/Swap";

export interface QuoteAttestationContext {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountInWei: string;
  minAmountOutWei: string;
  slippageBps: number;
  recipient: string;
  routerAddress: string;
  chainId: number;
  referrerAddress?: string;
}

export interface QuoteAttestationPayload {
  quote: UnsignedQuoteType;
  context: QuoteAttestationContext;
}

export const requestQuoteAttestation = async (
  payload: QuoteAttestationPayload
): Promise<QuoteIntegrity> => {
  const response = await fetch(`${BackendURL}quote/attest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Quote attestation failed (${response.status}): ${errorBody || "unknown error"}`
    );
  }

  const data = (await response.json()) as { integrity: QuoteIntegrity };
  if (!data?.integrity) {
    throw new Error("Quote attestation response missing integrity payload");
  }

  return data.integrity;
};
