/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOWED_DEXES?: string;
  readonly VITE_BLOCKED_DEXES?: string;
  readonly VITE_ENFORCE_ALLOWED_DEXES?: string; // "true" | "false"
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
