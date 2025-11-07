import { BrowserProvider } from "ethers";

/**
 * Sign a SIWE payload using the active wallet provider.
 * Falls back to window.ethereum if a custom provider is not supplied.
 */
export async function signSiweMessage(
  message: string,
  externalProvider?: any
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Wallet provider unavailable in this environment");
  }

  const providerSource =
    externalProvider || (window as any).provider || (window as any).ethereum;

  if (!providerSource) {
    throw new Error("Connect your wallet to continue");
  }

  const provider = new BrowserProvider(providerSource as any);
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}
