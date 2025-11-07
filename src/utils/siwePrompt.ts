import { SiweChallengePreview } from "./siwe";

export type SiwePromptHandler = (
  challenge: SiweChallengePreview
) => Promise<boolean>;

let promptHandler: SiwePromptHandler | null = null;

export const registerSiwePromptHandler = (handler: SiwePromptHandler) => {
  promptHandler = handler;
};

export const requestSiwePrompt = async (
  challenge: SiweChallengePreview
): Promise<boolean> => {
  if (promptHandler) {
    return promptHandler(challenge);
  }

  const message = [
    `Domain: ${challenge.domain}`,
    `Address: ${challenge.address}`,
    `Statement: ${challenge.statement || "-"}`,
    `URI: ${challenge.uri}`,
    `Chain ID: ${challenge.chainId}`,
    `Nonce: ${challenge.nonce}`,
    challenge.expirationTime ? `Expires: ${challenge.expirationTime}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return window.confirm(`Review SIWE challenge before signing:\n\n${message}`);
};
