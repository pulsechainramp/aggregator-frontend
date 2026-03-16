export const ZeroAddress = "0x0000000000000000000000000000000000000000";

export const AffiliateRouterAddress = "0x23c8CDc3d6d6F7B579c2d4c20ed345Be193FDfCc";
export const BridgeManagerAddress =
  "0x1715a3E4A142d8b698131108995174F37aEBA10D";
export const BridgeManagerAddressForNative =
  "0x8AC4ae65b3656e26dC4e0e69108B392283350f55";
export const BridgeManagerAddressPulse =
  "0x4fd0aaa7506f3d9cb8274bdb946ec42a1b8751ef";
export const BridgeManagerAddressForNativePulse =
  "0x0e18d0d556b652794ef12bf68b2dc857ef5f3996";
const requireEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
};

export const MulticallAddress = requireEnv("VITE_MULTICALL_ADDRESS");

const DEV_BACKEND_FALLBACK = "http://localhost:3000/";

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export const normalizeBackendURL = (
  candidate: string,
  { requireHttps = false }: { requireHttps?: boolean } = {}
) => {
  const trimmed = candidate.trim();
  if (!trimmed) {
    throw new Error("Backend URL cannot be empty");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Backend URL must be an absolute URL");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("Backend URL must not include query or hash segments");
  }

  if (requireHttps && parsed.protocol !== "https:") {
    throw new Error("Backend URL must use HTTPS in production");
  }

  return `${parsed.origin}${ensureTrailingSlash(parsed.pathname)}`;
};

const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
const backendSource =
  envBackendUrl && envBackendUrl.trim().length > 0
    ? envBackendUrl
    : import.meta.env.DEV
    ? DEV_BACKEND_FALLBACK
    : undefined;

if (!backendSource) {
  throw new Error(
    "Missing VITE_BACKEND_URL. Set it to an HTTPS endpoint before building."
  );
}

export const BackendURL = normalizeBackendURL(backendSource, {
  requireHttps: import.meta.env.PROD,
});
