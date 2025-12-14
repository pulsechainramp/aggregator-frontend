import { BrowserProvider } from "ethers";
import { requestSiwePrompt } from "./siwePrompt";

const CLIENT_ID_STORAGE_KEY = "pulsechainramp.siwe.clientId.v1";
const NONCE_HISTORY_KEY = "pulsechainramp.siwe.nonceHistory.v1";
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

const parseAllowedChainIds = (): number[] => {
  const raw = import.meta.env.VITE_SIWE_CHAIN_IDS ?? "369";
  const parsed = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
  return parsed.length > 0 ? parsed : [369];
};

const ALLOWED_CHAIN_IDS = parseAllowedChainIds();

const getHost = (): string => {
  if (typeof window === "undefined") {
    throw new Error("SIWE validation unavailable in this environment");
  }
  return window.location.hostname.toLowerCase();
};

const getOrigin = (): string => {
  if (typeof window === "undefined") {
    throw new Error("SIWE validation unavailable in this environment");
  }
  return window.location.origin;
};

const safeReadStorage = (key: string): string | null => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWriteStorage = (key: string, value: string): void => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
};

const loadNonceHistory = (): Record<string, number> => {
  const raw = safeReadStorage(NONCE_HISTORY_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed) {
      return parsed as Record<string, number>;
    }
  } catch {
    // ignore parse errors
  }
  return {};
};

const pruneNonceHistory = (history: Record<string, number>) => {
  const now = Date.now();
  for (const [nonce, timestamp] of Object.entries(history)) {
    if (!Number.isFinite(timestamp) || now - Number(timestamp) > NONCE_EXPIRY_MS) {
      delete history[nonce];
    }
  }
};

export const rememberSiweNonce = (nonce: string) => {
  const history = loadNonceHistory();
  pruneNonceHistory(history);
  history[nonce] = Date.now();
  safeWriteStorage(NONCE_HISTORY_KEY, JSON.stringify(history));
};

const hasSeenNonce = (nonce: string): boolean => {
  const history = loadNonceHistory();
  pruneNonceHistory(history);
  return Boolean(history[nonce]);
};

const generateRandomId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getOrCreateSiweClientId = (): string => {
  const existing = safeReadStorage(CLIENT_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const id = generateRandomId();
  safeWriteStorage(CLIENT_ID_STORAGE_KEY, id);
  return id;
};

export interface SiweChallengePreview {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt?: string;
  expirationTime?: string;
}

interface RawSiweFields {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
}

const parseSiweMessage = (message: string): RawSiweFields => {
  const lines = message.split("\n").map((line) => line.trimEnd());
  if (lines.length < 4) {
    throw new Error("Malformed SIWE message");
  }

  const headerSuffix =
    " wants you to sign in with your Ethereum account:";
  if (!lines[0].includes(headerSuffix)) {
    throw new Error("Invalid SIWE header");
  }

  const domain = lines[0].slice(0, lines[0].indexOf(headerSuffix)).trim();
  const address = lines[1].trim();
  let cursor = 2;

  while (cursor < lines.length && lines[cursor] === "") {
    cursor++;
  }

  let statement: string | undefined;
  if (
    cursor < lines.length &&
    !/^[A-Za-z][A-Za-z\s]+:/.test(lines[cursor])
  ) {
    statement = lines[cursor];
    cursor++;
    while (
      cursor < lines.length &&
      lines[cursor] !== "" &&
      !/^[A-Za-z][A-Za-z\s]+:/.test(lines[cursor])
    ) {
      statement += `\n${lines[cursor]}`;
      cursor++;
    }
  }

  while (cursor < lines.length && lines[cursor] === "") {
    cursor++;
  }

  const fieldMap: Record<string, string> = {};
  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor];
    if (!line.includes(":")) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim();
    const value = rest.join(":").trim();
    fieldMap[key] = value;
  }

  const uri = fieldMap["URI"];
  const version = fieldMap["Version"];
  const chainIdRaw = fieldMap["Chain ID"];
  const nonce = fieldMap["Nonce"];
  const issuedAt = fieldMap["Issued At"];
  const expirationTime = fieldMap["Expiration Time"];
  const notBefore = fieldMap["Not Before"];

  if (!uri || !version || !chainIdRaw || !nonce) {
    throw new Error("SIWE message missing required fields");
  }

  const chainId = Number(chainIdRaw);
  if (!Number.isFinite(chainId)) {
    throw new Error("Invalid SIWE chain id");
  }

  return {
    domain,
    address,
    statement,
    uri,
    version,
    chainId,
    nonce,
    issuedAt,
    expirationTime,
    notBefore,
  };
};

export interface ValidatedSiweChallenge {
  fields: RawSiweFields;
  preview: SiweChallengePreview;
}

export const validateSiweMessage = (
  message: string,
  walletAddress: string
): ValidatedSiweChallenge => {
  const fields = parseSiweMessage(message);
  const normalizedWallet = walletAddress.toLowerCase();

  if (fields.address.toLowerCase() !== normalizedWallet) {
    throw new Error("SIWE challenge is not addressed to the connected wallet");
  }

  const expectedDomain = getHost();
  if (fields.domain.toLowerCase() !== expectedDomain) {
    throw new Error("SIWE domain does not match this site");
  }

  if (fields.uri !== getOrigin()) {
    throw new Error("SIWE URI does not match this site");
  }

  if (!ALLOWED_CHAIN_IDS.includes(Number(fields.chainId))) {
    throw new Error("SIWE chain is not supported");
  }

  if (fields.expirationTime) {
    const expires = Date.parse(fields.expirationTime);
    if (!Number.isNaN(expires) && expires < Date.now()) {
      throw new Error("SIWE challenge has expired");
    }
  }

  if (fields.notBefore) {
    const notBefore = Date.parse(fields.notBefore);
    if (!Number.isNaN(notBefore) && notBefore > Date.now()) {
      throw new Error("SIWE challenge is not yet valid");
    }
  }

  if (hasSeenNonce(fields.nonce)) {
    throw new Error("SIWE nonce was already used recently");
  }

  return {
    fields,
    preview: {
      domain: fields.domain,
      address: fields.address,
      statement: fields.statement,
      uri: fields.uri,
      chainId: Number(fields.chainId),
      nonce: fields.nonce,
      issuedAt: fields.issuedAt,
      expirationTime: fields.expirationTime,
    },
  };
};

export const confirmSiweChallenge = async (
  preview: SiweChallengePreview
): Promise<void> => {
  const approved = await requestSiwePrompt(preview);
  if (!approved) {
    throw new Error("User rejected SIWE challenge");
  }
};

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

  const provider = new BrowserProvider(providerSource as any, "any");
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}
