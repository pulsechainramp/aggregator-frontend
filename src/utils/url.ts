const ABSOLUTE_HTTP_REGEX = /^https?:\/\//i;

type SanitizeOptions = {
  allowHttp?: boolean;
};

const getDefaultOptions = (): SanitizeOptions => ({
  allowHttp: Boolean(import.meta?.env?.DEV),
});

/**
 * Ensures only absolute HTTP(S) URLs are allowed to leave the app.
 * Returns a normalized string or null when the value is unsafe.
 */
export function sanitizeExternalUrl(
  raw: string | null | undefined,
  options?: SanitizeOptions
): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || !ABSOLUTE_HTTP_REGEX.test(trimmed)) {
    return null;
  }

  const { allowHttp } = { ...getDefaultOptions(), ...options };

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "https:") {
      return parsed.toString();
    }
    if (protocol === "http:" && allowHttp) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}
