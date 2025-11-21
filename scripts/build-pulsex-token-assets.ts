import fs from "fs/promises";
import path from "path";
import { getAddress } from "ethers";
import {
  PulsexToken,
  PulsexTokenOrigin,
  PulsexTokenStatus,
  PulsexTokenTier,
} from "../src/types/PulsexTokens";

type CoreToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  preferredLogoURI?: string;
  origin?: PulsexTokenOrigin;
  originAddress?: string;
  originChainId?: 1;
};

type PiteasList = {
  tokens: PiteasToken[];
};

type PiteasToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
};

type Pls369Info = {
  id?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  status?: string;
  description?: string;
  tags?: string[];
};

type TokenArtifact = {
  token: PulsexToken;
  logoCandidates: string[];
};

type LogoStats = {
  downloaded: number;
  reused: number;
  missing: number;
};

const CHAIN_ID = 369;
const ETHEREUM_CHAIN_ID = 1;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_ADDRESS_LOWER = ZERO_ADDRESS.toLowerCase();
const PITEAS_TOKENLIST_URL =
  "https://raw.githubusercontent.com/piteasio/app-tokens/main/piteas-tokenlist.json";
const PLS_ASSETS_BASE =
  "https://raw.githubusercontent.com/PLS369/pulsechain-assets/main/blockchain/pulsechain/assets";
const DEFAULT_PULSECHAIN_RPC =
  process.env.PULSECHAIN_RPC_URL ?? "https://rpc.pulsechain.com";
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const LOGO_DIR = path.join(PUBLIC_DIR, "token-logos", "pulsex", `${CHAIN_ID}`);
const OUTPUT_JSON = path.join(PUBLIC_DIR, "pulsex-tokens.json");
const PREFORK_JSON = path.join(PUBLIC_DIR, "pulsex-tokens-prefork.json");
const REPORT_PATH = path.join(__dirname, "reports", "pulsex-token-build.json");
const CORE_TOKEN_PATH = path.join(__dirname, "data", "corePulsexTokens.json");

const NATIVE_SYMBOLS = new Set(["PLS", "WPLS", "PLSX", "INC", "HEX"]);
const NATIVE_ADDRESSES = new Set(
  [
    ZERO_ADDRESS,
    "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
  ].map((address) => address.toLowerCase())
);
const PREFORK_ADDRESSES = new Set(
  [
    "0xA0b86991C6218B36c1d19D4a2e9Eb0cE3606eB48",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  ].map((address) => address.toLowerCase())
);
const BRIDGED_NAME_REGEX = /from ethereum/i;
const ADDRESS_REGEX = /(0x[a-fA-F0-9]{40})/;

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
  try {
    return getAddress(address);
  } catch {
    throw new Error(`Invalid address encountered: ${address}`);
  }
};

const jsonRpcRequest = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const response = await fetch(DEFAULT_PULSECHAIN_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      ...payload,
    }),
  });
  if (!response.ok) {
    throw new Error(`PulseChain RPC error ${response.status}`);
  }
  const json = (await response.json()) as { result?: T; error?: unknown };
  if ("error" in json && json.error) {
    throw new Error(`PulseChain RPC returned error: ${JSON.stringify(json.error)}`);
  }
  if (!("result" in json)) {
    throw new Error("PulseChain RPC response missing result");
  }
  return json.result as T;
};

const hasPulsechainBytecode = async (address: string) => {
  const result = await jsonRpcRequest<string>({
    method: "eth_getCode",
    params: [address, "latest"],
  });
  return typeof result === "string" && result !== "0x";
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

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return (await response.json()) as T;
};

const loadCoreTokens = async (): Promise<CoreToken[]> => {
  const raw = await fs.readFile(CORE_TOKEN_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("corePulsexTokens.json must be an array");
  }
  return parsed;
};

const loadPiteasTokens = async (): Promise<PiteasToken[]> => {
  const json = await fetchJson<PiteasList>(PITEAS_TOKENLIST_URL);
  if (!Array.isArray(json.tokens)) {
    throw new Error("Piteas token list missing tokens array");
  }
  return json.tokens.filter((token) => token.chainId === CHAIN_ID);
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
) => {
  const results: R[] = new Array(items.length);
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) || 1 }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      try {
        results[current] = await worker(items[current]);
      } catch (error) {
        throw error;
      }
    }
  });
  await Promise.all(runners);
  return results;
};

const fetchPls369Info = async (address: string): Promise<Pls369Info | undefined> => {
  const checksum = normalizeAddress(address);
  const url = `${PLS_ASSETS_BASE}/${checksum}/info.json`;
  const response = await fetch(url);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return (await response.json()) as Pls369Info;
};

const loadPlsInfoMap = async (addresses: string[]) => {
  const unique = [...new Set(addresses.map((addr) => normalizeAddress(addr)))];
  const results = await mapWithConcurrency(unique, 8, async (address) => {
    try {
      const info = await fetchPls369Info(address);
      return { address, info };
    } catch (error) {
      console.warn(`Failed to fetch PLS369 info for ${address}:`, error);
      return { address, info: undefined };
    }
  });
  const map = new Map<string, Pls369Info>();
  for (const { address, info } of results) {
    if (info) {
      map.set(address, info);
    }
  }
  return map;
};

const isPreforkToken = (address: string, symbol: string) => {
  const lower = address.toLowerCase();
  return PREFORK_ADDRESSES.has(lower) && symbol.toLowerCase().startsWith("p");
};

const isNativeToken = (symbol: string, address: string) => {
  return (
    NATIVE_SYMBOLS.has(symbol.toUpperCase()) || NATIVE_ADDRESSES.has(address.toLowerCase())
  );
};

const hasBridgedNameHint = (name?: string) => {
  if (!name) return false;
  return BRIDGED_NAME_REGEX.test(name);
};

const extractOriginAddress = (inputs: (string | undefined)[]) => {
  for (const text of inputs) {
    if (!text) continue;
    const match = text.match(ADDRESS_REGEX);
    if (!match) continue;
    try {
      return getAddress(match[1]);
    } catch {
      continue;
    }
  }
  return undefined;
};

const deriveStatus = (info?: Pls369Info): PulsexTokenStatus => {
  const raw = info?.status?.toLowerCase();
  if (raw === "active" || raw === "abandoned" || raw === "spam") {
    return raw;
  }
  return "unknown";
};

const deriveTier = (
  core?: CoreToken,
  piteas?: PiteasToken,
  info?: Pls369Info,
  status?: PulsexTokenStatus
): PulsexTokenTier => {
  if (core) {
    return "core";
  }
  const safeStatus =
    !status || (status !== "spam" && status !== "abandoned");
  if (piteas && info && safeStatus) {
    return "verified";
  }
  return "unverified";
};

const deriveOrigin = ({
  address,
  name,
  symbol,
  core,
  piteas,
  info,
}: {
  address: string;
  name: string;
  symbol: string;
  core?: CoreToken;
  piteas?: PiteasToken;
  info?: Pls369Info;
}): {
  origin: PulsexTokenOrigin;
  originAddress?: string;
  originChainId?: 1;
} => {
  if (core?.origin) {
    return {
      origin: core.origin,
      originAddress: core.originAddress,
      originChainId: core.originChainId,
    };
  }

  if (core?.originAddress && !core.origin) {
    return {
      origin: "bridged-eth",
      originAddress: core.originAddress,
      originChainId: ETHEREUM_CHAIN_ID,
    };
  }

  if (isPreforkToken(address, symbol)) {
    return {
      origin: "prefork",
      originAddress: address,
      originChainId: ETHEREUM_CHAIN_ID,
    };
  }

  if (isNativeToken(symbol, address)) {
    return { origin: "native" };
  }

  const bridgedHint =
    hasBridgedNameHint(name) ||
    hasBridgedNameHint(piteas?.name) ||
    symbol.toLowerCase().endsWith(".e");
  const originAddress =
    core?.originAddress ??
    extractOriginAddress([info?.description]) ??
    extractOriginAddress([piteas?.name]);

  if (bridgedHint || originAddress) {
    return {
      origin: "bridged-eth",
      originAddress,
      originChainId: originAddress ? ETHEREUM_CHAIN_ID : undefined,
    };
  }

  return { origin: "unknown" };
};

const mergeTokenSources = ({
  coreTokens,
  piteasTokens,
  plsInfoMap,
}: {
  coreTokens: CoreToken[];
  piteasTokens: PiteasToken[];
  plsInfoMap: Map<string, Pls369Info>;
}) => {
  const artifacts: TokenArtifact[] = [];
  const skippedSpam: string[] = [];

  const coreMap = new Map<string, CoreToken>();
  for (const token of coreTokens) {
    const checksum = normalizeAddress(token.address);
    coreMap.set(checksum, { ...token, address: checksum });
  }

  const piteasMap = new Map<string, PiteasToken>();
  for (const token of piteasTokens) {
    const checksum = normalizeAddress(token.address);
    piteasMap.set(checksum, { ...token, address: checksum });
  }

  const addresses = new Set<string>([...coreMap.keys(), ...piteasMap.keys()]);

  for (const address of addresses) {
    const core = coreMap.get(address);
    const piteas = piteasMap.get(address);
    const info = plsInfoMap.get(address);

    if (!core && !piteas) continue;

    const symbol = core?.symbol ?? piteas?.symbol ?? info?.symbol ?? "UNKNOWN";
    const name = core?.name ?? piteas?.name ?? info?.name ?? symbol;
    const decimals = core?.decimals ?? piteas?.decimals ?? info?.decimals ?? 18;

    const status = deriveStatus(info);
    if (!core && status === "spam") {
      skippedSpam.push(`${symbol} (${address})`);
      continue;
    }

    const tier = deriveTier(core, piteas, info, status);
    const originResult = deriveOrigin({ address, name, symbol, core, piteas, info });

    const tags = dedupeStrings([...(piteas?.tags ?? []), ...(info?.tags ?? [])]);
    const plsLogo = `${PLS_ASSETS_BASE}/${address}/logo.png`;

    const remoteCandidates = dedupeStrings([
      core?.preferredLogoURI,
      plsLogo,
      piteas?.logoURI,
    ]);

    const sources: PulsexToken["sources"] = {};
    if (core) sources.core = true;
    if (piteas) sources.piteas = true;
    if (info) sources.pls369 = true;

    const token: PulsexToken = {
      chainId: CHAIN_ID,
      address,
      symbol,
      name,
      decimals,
      origin: originResult.origin,
      originChainId: originResult.originChainId,
      originAddress: originResult.originAddress,
      tier,
      status,
      logoURI: undefined,
      remoteLogoURIs: remoteCandidates.length ? remoteCandidates : undefined,
      sources,
      tags: tags.length ? tags : undefined,
    };

    artifacts.push({
      token,
      logoCandidates: remoteCandidates,
    });
  }

  return { artifacts, skippedSpam };
};

const filterArtifactsByBytecode = async (artifacts: TokenArtifact[]) => {
  const addressMap = new Map<string, string>();
  for (const artifact of artifacts) {
    const checksum = artifact.token.address;
    const lower = checksum.toLowerCase();
    if (lower === ZERO_ADDRESS_LOWER) continue;
    if (!addressMap.has(lower)) {
      addressMap.set(lower, checksum);
    }
  }

  const uniqueAddresses = [...addressMap.values()];
  const results = await mapWithConcurrency(uniqueAddresses, 8, async (address) => {
    const exists = await hasPulsechainBytecode(address);
    return { lower: address.toLowerCase(), exists };
  });
  const existenceMap = new Map(results.map((entry) => [entry.lower, entry.exists]));

  const kept: TokenArtifact[] = [];
  const missing: string[] = [];

  for (const artifact of artifacts) {
    const lower = artifact.token.address.toLowerCase();
    if (lower === ZERO_ADDRESS_LOWER) {
      kept.push(artifact);
      continue;
    }
    const exists = existenceMap.get(lower) ?? false;
    if (!exists && !artifact.token.sources.core) {
      missing.push(`${artifact.token.symbol} (${artifact.token.address})`);
      continue;
    }
    if (!exists) {
      console.warn(
        `Core token ${artifact.token.symbol} (${artifact.token.address}) missing bytecode on PulseChain; keeping due to core override.`
      );
    }
    kept.push(artifact);
  }

  return { artifacts: kept, missing };
};

const ensureLocalLogo = async (artifact: TokenArtifact): Promise<{
  logoURI?: string;
  downloaded: boolean;
  reused: boolean;
}> => {
  const fileName = `${artifact.token.address}.png`;
  const fullPath = path.join(LOGO_DIR, fileName);
  const existingFile = await fileExists(fullPath);

  for (const candidate of artifact.logoCandidates) {
    try {
      const buffer = await downloadImage(candidate);
      await fs.writeFile(fullPath, buffer);
      return {
        logoURI: `/token-logos/pulsex/${CHAIN_ID}/${fileName}`,
        downloaded: true,
        reused: false,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        await sleep(500);
      }
    }
  }

  if (existingFile) {
    return {
      logoURI: `/token-logos/pulsex/${CHAIN_ID}/${fileName}`,
      downloaded: false,
      reused: true,
    };
  }

  return { logoURI: undefined, downloaded: false, reused: false };
};

const downloadLogos = async (artifacts: TokenArtifact[]): Promise<LogoStats> => {
  await ensureDir(LOGO_DIR);
  let downloaded = 0;
  let reused = 0;
  let missing = 0;

  for (const artifact of artifacts) {
    const { logoURI, downloaded: didDownload, reused: didReuse } = await ensureLocalLogo(
      artifact
    );
    artifact.token.logoURI = logoURI;
    if (didDownload) {
      downloaded += 1;
    } else if (didReuse) {
      reused += 1;
    } else if (!logoURI) {
      missing += 1;
    }
  }

  return { downloaded, reused, missing };
};

const writeOutputs = async ({
  artifacts,
  logoStats,
}: {
  artifacts: TokenArtifact[];
  logoStats: LogoStats;
}) => {
  const tokens = artifacts
    .map((artifact) => artifact.token)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(tokens, null, 2));

  const preforkTokens = tokens.filter((token) => token.origin === "prefork");
  await fs.writeFile(PREFORK_JSON, JSON.stringify(preforkTokens, null, 2));

  const tierCounts = tokens.reduce(
    (acc, token) => {
      acc[token.tier] += 1;
      return acc;
    },
    { core: 0, verified: 0, unverified: 0 } as Record<PulsexTokenTier, number>
  );

  const originCounts = tokens.reduce(
    (acc, token) => {
      acc[token.origin] += 1;
      return acc;
    },
    {
      native: 0,
      "bridged-eth": 0,
      prefork: 0,
      unknown: 0,
    } as Record<PulsexTokenOrigin, number>
  );

  const statusCounts = tokens.reduce(
    (acc, token) => {
      acc[token.status] += 1;
      return acc;
    },
    {
      active: 0,
      abandoned: 0,
      spam: 0,
      unknown: 0,
    } as Record<PulsexTokenStatus, number>
  );

  const summary = {
    timestamp: new Date().toISOString(),
    totalTokens: tokens.length,
    tokensWithLogos: tokens.filter((token) => Boolean(token.logoURI)).length,
    tierCounts,
    originCounts,
    statusCounts,
    logoStats,
  };

  await ensureDir(path.dirname(REPORT_PATH));
  await fs.writeFile(REPORT_PATH, JSON.stringify(summary, null, 2));

  console.log(`Tokens (chain ${CHAIN_ID}): ${tokens.length}`);
  console.log(`Prefork tokens: ${preforkTokens.length}`);
  console.log(
    `Logos downloaded: ${logoStats.downloaded}, reused: ${logoStats.reused}, missing: ${logoStats.missing}`
  );
};

const main = async () => {
  console.log("Building PulseX token assets...");
  const coreTokens = await loadCoreTokens();
  const piteasTokens = await loadPiteasTokens();

  console.log(
    `Loaded ${coreTokens.length} core tokens and ${piteasTokens.length} Piteas entries`
  );

  const addressesForInfo = [
    ...new Set([...coreTokens, ...piteasTokens].map((token) => token.address)),
  ];

  const plsInfoMap = await loadPlsInfoMap(addressesForInfo);
  console.log(`Fetched ${plsInfoMap.size} PLS369 metadata entries`);

  const { artifacts, skippedSpam } = mergeTokenSources({
    coreTokens,
    piteasTokens,
    plsInfoMap,
  });

  if (skippedSpam.length > 0) {
    console.warn(`Skipped tokens marked as spam: ${skippedSpam.join(", ")}`);
  }

  const { artifacts: verifiedArtifacts, missing } = await filterArtifactsByBytecode(
    artifacts
  );
  if (missing.length > 0) {
    console.warn(
      `Skipped ${missing.length} tokens with no PulseChain bytecode: ${missing.join(", ")}`
    );
  }

  const logoStats = await downloadLogos(verifiedArtifacts);
  await writeOutputs({ artifacts: verifiedArtifacts, logoStats });
  console.log("PulseX token assets build complete.");
};

main().catch((error) => {
  console.error("Failed to build PulseX token assets.");
  console.error(error);
  process.exit(1);
});
