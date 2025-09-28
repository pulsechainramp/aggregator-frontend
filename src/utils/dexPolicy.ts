export const ENFORCE_ALLOWED_DEXES =
  (String(import.meta.env.VITE_ENFORCE_ALLOWED_DEXES ?? 'true').toLowerCase() === 'true');

// Slugs must match canonicalized names from toCorrectDexName() (lowercase).
// Keep this aligned with the server DEFAULT_ALLOWED.
export const DEFAULT_ALLOWED = [
  'pulsexv1',
  'pulsexv2',
  'pulsexstable',
  'phux',
  '9inchv2',
  '9inchv3',
  '9mmv2',
  '9mmv3',
  'pdexv3',
  'dextop',
];

export function toCorrectDexName(dex: string): string {
  if (!dex) return '';
  // Normalize known variants (mirror of routing/src/utils/web3.ts)
  const d = String(dex).trim();
  if (d === 'PulseX V1') return 'pulsexV1';
  if (d === 'PulseX V2') return 'pulsexV2';
  if (d === 'PulseX Stable') return 'pulsexStable';
  if (d === 'Phux') return 'phux';
  if (d === '9inch V2') return '9inchV2';
  if (d === '9inch V3') return '9inchV3';
  if (d === '9mm V2') return '9mmV2';
  if (d === '9mm V3') return '9mmV3';
  if (d === 'pDex V3') return 'pDexV3';
  if (d.toLowerCase() === 'dextop' || d === 'DEXTop') return 'dextop';
  // Fallback: compact to an alphanumeric slug to reduce drift risk
  return d.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Start from env override if present; then apply per-call allow/block deltas.
export function buildAllowlistFromEnvAndQuery(
  base = new Set<string>(DEFAULT_ALLOWED.map(s => s.toLowerCase())),
  allowedCsv?: string,
  blockedCsv?: string
): Set<string> {
  const envCsv = (import.meta.env.VITE_ALLOWED_DEXES as string | undefined);
  if (envCsv) base = new Set(envCsv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

  const allow = new Set(base);
  if (allowedCsv) for (const s of allowedCsv.split(',')) allow.add(s.trim().toLowerCase());
  if (blockedCsv) for (const s of blockedCsv.split(',')) allow.delete(s.trim().toLowerCase());
  return allow;
}

// Mirror of server-side traversal in PiteasService.findUnsupportedDexes()
export function findUnsupportedDexes(route: any, allow: Set<string>): string[] {
  const seen = new Set<string>();
  const add = (ex?: string) => {
    if (!ex) return;
    const canon = (toCorrectDexName(ex) || '').toLowerCase();
    if (canon) seen.add(canon);
    else seen.add(`unknown:${String(ex)}`);
  };
  if (!route) return [];

  // Intended structure: route.swaps[*].subswaps[*].paths[*].exchange
  for (const sw of route.swaps ?? []) {
    for (const ss of sw.subswaps ?? []) {
      for (const p of ss.paths ?? []) add(p?.exchange);
    }
    for (const p of sw.paths ?? []) add(p?.exchange);
  }

  // Ultra-flat fallbacks sometimes seen in SDKs
  for (const p of route.paths ?? []) {
    if (p?.exchange) add(p.exchange);
    for (const pp of p?.paths ?? []) if (pp?.exchange) add(pp.exchange);
  }

  const bad: string[] = [];
  seen.forEach((d) => {
    if (d.startsWith('unknown:') || !allow.has(d)) bad.push(d);
  });
  return bad;
}
