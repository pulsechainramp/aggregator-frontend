/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_PITEAS_API_BASE_URL?: string;
  readonly VITE_PULSECHAIN_RPC_URLS?: string;
  readonly VITE_ETHEREUM_RPC_URLS?: string;
  readonly VITE_RPC_STALL_TIMEOUT_MS?: string;
  readonly VITE_RPC_RETRY_COUNT?: string;
  readonly VITE_RPC_RETRY_DELAY_MS?: string;
  readonly VITE_RPC_COOLDOWN_MS?: string;
  readonly VITE_ETH_RPC_STALL_TIMEOUT_MS?: string;
  readonly VITE_ETH_RPC_RETRY_COUNT?: string;
  readonly VITE_ETH_RPC_RETRY_DELAY_MS?: string;
  readonly VITE_ETH_RPC_COOLDOWN_MS?: string;
  readonly VITE_QUOTE_SIGNER_ADDRESS?: string;
  readonly VITE_SIWE_CHAIN_IDS?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
