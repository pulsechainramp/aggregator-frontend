import Web3 from "web3";
import { FallbackProvider, JsonRpcProvider } from "ethers";
import { pulsechainRpcConfig } from "./pulsechainRpcConfig";

type RpcEndpoint = {
  url: string;
  failedUntil: number;
};

const logPrefix = "[PulseChain RPC]";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldCooldown = (error: any): boolean => {
  if (!error) return false;
  if (error.name === "AbortError") {
    return true;
  }
  if (typeof error.status === "number" && (error.status === 429 || error.status >= 500)) {
    return true;
  }
  if (typeof error.message === "string" && /network|fetch|timeout|Failed to fetch/i.test(error.message)) {
    return true;
  }
  return false;
};

const serializeError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const err = error as any;
  return {
    code: err.code,
    status: err.status,
    message: err.message,
    shortMessage: err.shortMessage,
  };
};

class MultiRpcHttpProvider {
  private readonly endpoints: RpcEndpoint[];

  constructor(urls: string[]) {
    this.endpoints = urls.map((url) => ({ url, failedUntil: 0 }));
  }

  public send(payload: any, callback: (error: any, result?: any) => void) {
    this.request(payload)
      .then((result) => callback(null, result))
      .catch((error) => callback(error, null));
  }

  public sendAsync(payload: any, callback: (error: any, result?: any) => void) {
    this.send(payload, callback);
  }

  private async request(payload: any): Promise<any> {
    const batch = Array.isArray(payload) ? payload : [payload];
    const response = await this.performWithRetries(batch);
    return Array.isArray(payload) ? response : response[0];
  }

  private async performWithRetries(batch: any[]): Promise<any[]> {
    let lastError: any;

    for (let attempt = 0; attempt <= pulsechainRpcConfig.retryCount; attempt++) {
      const candidates = this.getReadyEndpoints();

      for (const endpoint of candidates) {
        try {
          const result = await this.sendToEndpoint(endpoint, batch);
          if (endpoint.failedUntil !== 0) {
            endpoint.failedUntil = 0;
            console.info(`${logPrefix} ${endpoint.url} recovered`);
          }
          return result;
        } catch (error) {
          lastError = error;
          if (shouldCooldown(error)) {
            endpoint.failedUntil = Date.now() + pulsechainRpcConfig.cooldownMs;
            console.warn(`${logPrefix} ${endpoint.url} failed`, {
              error: serializeError(error),
              cooldownMs: pulsechainRpcConfig.cooldownMs,
            });
          } else {
            console.warn(`${logPrefix} ${endpoint.url} error`, serializeError(error));
          }
        }
      }

      if (attempt < pulsechainRpcConfig.retryCount && pulsechainRpcConfig.retryDelayMs > 0) {
        await sleep(pulsechainRpcConfig.retryDelayMs);
      }
    }

    throw lastError ?? new Error("All PulseChain RPC providers failed");
  }

  private getReadyEndpoints(): RpcEndpoint[] {
    const now = Date.now();
    const ready = this.endpoints.filter((endpoint) => endpoint.failedUntil <= now);
    return ready.length > 0 ? ready : this.endpoints;
  }

  private async sendToEndpoint(endpoint: RpcEndpoint, payload: any[]): Promise<any[]> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (pulsechainRpcConfig.stallTimeoutMs > 0) {
      timeout = setTimeout(() => controller.abort(), pulsechainRpcConfig.stallTimeoutMs);
    }

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error: any = new Error(`RPC ${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

class CircuitBreakerJsonRpcProvider extends JsonRpcProvider {
  private failedUntil = 0;

  constructor(private readonly rpcUrl: string) {
    super(rpcUrl, { chainId: 369, name: "pulsechain" });
  }

  override _getConnection() {
    const connection = super._getConnection();
    if (pulsechainRpcConfig.stallTimeoutMs > 0) {
      connection.timeout = pulsechainRpcConfig.stallTimeoutMs;
    }
    return connection;
  }

  override async send(method: string, params: Array<any>): Promise<any> {
    const now = Date.now();
    if (now < this.failedUntil) {
      throw Object.assign(new Error(`RPC provider ${this.rpcUrl} cooling down`), {
        code: "RPC_COOLDOWN",
      });
    }

    try {
      const result = await super.send(method, params);
      if (this.failedUntil !== 0) {
        this.failedUntil = 0;
        console.info(`${logPrefix} ${this.rpcUrl} recovered`);
      }
      return result;
    } catch (error: any) {
      if (shouldCooldown(error)) {
        this.failedUntil = Date.now() + pulsechainRpcConfig.cooldownMs;
        console.warn(`${logPrefix} ${this.rpcUrl} failed`, {
          error: serializeError(error),
          cooldownMs: pulsechainRpcConfig.cooldownMs,
        });
      }
      throw error;
    }
  }
}

class RetryingFallbackProvider extends FallbackProvider {
  override async _perform(req: any): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt <= pulsechainRpcConfig.retryCount; attempt++) {
      try {
        return await super._perform(req);
      } catch (error: any) {
        lastError = error;
        const transient = shouldCooldown(error) || error?.code === "RPC_COOLDOWN";
        if (!transient || attempt === pulsechainRpcConfig.retryCount) {
          throw error;
        }
        console.warn(`${logPrefix} retrying ${req?.method ?? "rpc"}`, {
          attempt: attempt + 1,
          error: serializeError(error),
        });
        if (pulsechainRpcConfig.retryDelayMs > 0) {
          await sleep(pulsechainRpcConfig.retryDelayMs);
        }
      }
    }

    throw lastError;
  }
}

const httpProvider = new MultiRpcHttpProvider(pulsechainRpcConfig.urls);
const pulsechainWeb3 = new Web3(httpProvider as any);

const circuitBreakerProviders = pulsechainRpcConfig.urls.map(
  (url) => new CircuitBreakerJsonRpcProvider(url)
);

const fallbackProvider = new RetryingFallbackProvider(
  circuitBreakerProviders.map((provider, index) => ({
    provider,
    priority: index + 1,
    stallTimeout: pulsechainRpcConfig.stallTimeoutMs,
    weight: 1,
  })),
  1
);

export const getPulsechainWeb3 = () => pulsechainWeb3;

export const getPulsechainEthersProvider = () => fallbackProvider;
