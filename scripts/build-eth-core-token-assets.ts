import fs from "fs/promises";
import path from "path";
import { getAddress } from "ethers";
import { EthToken } from "../src/types/PulsexTokens";

type EthConfigToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  preferredLogoURI?: string;
  isNative?: boolean;
};

const ETH_CHAIN_ID = 1;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TRUST_WALLET_BASE =
  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum";
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const LOGO_DIR = path.join(PUBLIC_DIR, "token-logos", "eth");
const OUTPUT_JSON = path.join(PUBLIC_DIR, "eth-core-tokens.json");
const CONFIG_PATH = path.join(__dirname, "data", "ethCoreTokens.json");

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const fileExists = async (candidate: string) => {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const dedupeStrings = (values: (string | undefined)[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

const normalizeAddress = (address: string) => {
  if (address.toLowerCase() === ZERO_ADDRESS) {
    return ZERO_ADDRESS;
  }
  try {
    const checksum = getAddress(address.toLowerCase());
    return checksum;
  } catch {
    throw new Error(`Invalid Ethereum address encountered: ${address}`);
  }
};

const buildTrustWalletLogo = (address: string) => {
  if (address.toLowerCase() === ZERO_ADDRESS) {
    return `${TRUST_WALLET_BASE}/info/logo.png`;
  }
  return `${TRUST_WALLET_BASE}/assets/${address}/logo.png`;
};

const downloadImage = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Unsupported content-type ${contentType}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  } finally {
    clearTimeout(timeoutId);
  }
};

const loadConfigTokens = async (): Promise<EthConfigToken[]> => {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("ethCoreTokens.json must be an array");
  }
  return parsed;
};

const ensureLocalLogo = async (address: string, candidates: string[]) => {
  const fileName = `${address}.png`;
  const destPath = path.join(LOGO_DIR, fileName);
  const existingFile = await fileExists(destPath);

  for (const candidate of candidates) {
    try {
      const buffer = await downloadImage(candidate);
      await fs.writeFile(destPath, buffer);
      return { logoURI: `/token-logos/eth/${fileName}`, downloaded: true, reused: false };
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        await sleep(500);
      }
    }
  }

  if (existingFile) {
    return { logoURI: `/token-logos/eth/${fileName}`, downloaded: false, reused: true };
  }

  return { logoURI: undefined, downloaded: false, reused: false };
};

const main = async () => {
  console.log("Building Ethereum core token assets...");
  const configTokens = await loadConfigTokens();

  await ensureDir(LOGO_DIR);

  const output: EthToken[] = [];
  let downloaded = 0;
  let reused = 0;
  let missing = 0;

  for (const token of configTokens) {
    if (token.chainId !== ETH_CHAIN_ID) {
      throw new Error(`Invalid chainId for ${token.symbol}: ${token.chainId}`);
    }

    const address = normalizeAddress(token.address);
    const remoteCandidates = dedupeStrings([
      token.preferredLogoURI,
      buildTrustWalletLogo(address),
    ]);

    const { logoURI, downloaded: didDownload, reused: didReuse } = await ensureLocalLogo(
      address,
      remoteCandidates
    );

    if (didDownload) downloaded += 1;
    else if (didReuse) reused += 1;
    else if (!logoURI) missing += 1;

    const coreToken: EthToken = {
      chainId: ETH_CHAIN_ID,
      address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI,
      remoteLogoURIs: remoteCandidates.length ? remoteCandidates : undefined,
      isNative: token.isNative ? true : undefined,
    };

    output.push(coreToken);
  }

  output.sort((a, b) => a.symbol.localeCompare(b.symbol));
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(output, null, 2));

  console.log(`Wrote ${output.length} Ethereum tokens to eth-core-tokens.json`);
  console.log(
    `Logos downloaded: ${downloaded}, reused: ${reused}, missing: ${missing}`
  );
};

main().catch((error) => {
  console.error("Failed to build Ethereum core token assets.");
  console.error(error);
  process.exit(1);
});
