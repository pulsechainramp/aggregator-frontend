export type CountryLocaleInfo = {
  locale: string;
  decimalStyle?: "comma" | "dot";
};

export const COUNTRY_LOCALE_MAP: Record<string, CountryLocaleInfo> = {
  ZZ: { locale: "en-US", decimalStyle: "dot" },
  US: { locale: "en-US", decimalStyle: "dot" },
  CA: { locale: "en-CA", decimalStyle: "dot" },
  GB: { locale: "en-GB", decimalStyle: "dot" },
  AE: { locale: "en-AE", decimalStyle: "dot" },
  AR: { locale: "es-AR", decimalStyle: "comma" },
  AT: { locale: "de-AT", decimalStyle: "comma" },
  AU: { locale: "en-AU", decimalStyle: "dot" },
  BH: { locale: "en-BH", decimalStyle: "dot" },
  BE: { locale: "fr-BE", decimalStyle: "comma" },
  BG: { locale: "bg-BG", decimalStyle: "comma" },
  BR: { locale: "pt-BR", decimalStyle: "comma" },
  CL: { locale: "es-CL", decimalStyle: "comma" },
  CO: { locale: "es-CO", decimalStyle: "comma" },
  HR: { locale: "hr-HR", decimalStyle: "comma" },
  CY: { locale: "el-CY", decimalStyle: "comma" },
  CZ: { locale: "cs-CZ", decimalStyle: "comma" },
  DE: { locale: "de-DE", decimalStyle: "comma" },
  DK: { locale: "da-DK", decimalStyle: "comma" },
  EE: { locale: "et-EE", decimalStyle: "comma" },
  FI: { locale: "fi-FI", decimalStyle: "comma" },
  FR: { locale: "fr-FR", decimalStyle: "comma" },
  GH: { locale: "en-GH", decimalStyle: "dot" },
  GR: { locale: "el-GR", decimalStyle: "comma" },
  HK: { locale: "zh-HK", decimalStyle: "dot" },
  HU: { locale: "hu-HU", decimalStyle: "comma" },
  ID: { locale: "id-ID", decimalStyle: "comma" },
  IE: { locale: "en-IE", decimalStyle: "dot" },
  IL: { locale: "he-IL", decimalStyle: "dot" },
  IS: { locale: "is-IS", decimalStyle: "comma" },
  IN: { locale: "en-IN", decimalStyle: "dot" },
  IT: { locale: "it-IT", decimalStyle: "comma" },
  JP: { locale: "ja-JP", decimalStyle: "dot" },
  KE: { locale: "en-KE", decimalStyle: "dot" },
  LT: { locale: "lt-LT", decimalStyle: "comma" },
  LV: { locale: "lv-LV", decimalStyle: "comma" },
  LU: { locale: "fr-LU", decimalStyle: "comma" },
  MX: { locale: "es-MX", decimalStyle: "dot" },
  MY: { locale: "ms-MY", decimalStyle: "dot" },
  NG: { locale: "en-NG", decimalStyle: "dot" },
  NL: { locale: "nl-NL", decimalStyle: "comma" },
  NO: { locale: "nb-NO", decimalStyle: "comma" },
  NZ: { locale: "en-NZ", decimalStyle: "dot" },
  OM: { locale: "en-OM", decimalStyle: "dot" },
  PE: { locale: "es-PE", decimalStyle: "dot" },
  PH: { locale: "en-PH", decimalStyle: "dot" },
  PL: { locale: "pl-PL", decimalStyle: "comma" },
  PT: { locale: "pt-PT", decimalStyle: "comma" },
  RO: { locale: "ro-RO", decimalStyle: "comma" },
  SA: { locale: "en-SA", decimalStyle: "dot" },
  ES: { locale: "es-ES", decimalStyle: "comma" },
  SG: { locale: "en-SG", decimalStyle: "dot" },
  SI: { locale: "sl-SI", decimalStyle: "comma" },
  SK: { locale: "sk-SK", decimalStyle: "comma" },
  ZA: {
    locale: "en-ZA",
    decimalStyle: "comma", // CLDR/Intl uses comma; plan example mentioned dot, but browser data is comma.
  },
  KR: { locale: "ko-KR", decimalStyle: "dot" },
  SE: { locale: "sv-SE", decimalStyle: "comma" },
  CH: {
    locale: "de-CH",
    decimalStyle: "dot", // Intl/CLDR decimal is dot; plan note mentioned comma but browsers use dot.
  },
  TH: { locale: "th-TH", decimalStyle: "dot" },
  TR: { locale: "tr-TR", decimalStyle: "comma" },
  TW: { locale: "zh-TW", decimalStyle: "dot" },
  UA: { locale: "uk-UA", decimalStyle: "comma" },
};

export const getLocaleForCountry = (
  country: string | null | undefined,
  fallback = "en-US"
): string => {
  if (!country) return fallback;
  const upper = country.toUpperCase();
  return COUNTRY_LOCALE_MAP[upper]?.locale ?? fallback;
};

export const getDecimalStyleForCountry = (
  country: string | null | undefined
): "comma" | "dot" | null => {
  if (!country) return null;
  const upper = country.toUpperCase();
  return COUNTRY_LOCALE_MAP[upper]?.decimalStyle ?? null;
};
