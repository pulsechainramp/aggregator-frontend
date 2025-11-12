import { FallbackProvider, JsonRpcProvider } from "ethers";

export type RpcConfig = {
  urls: string[];
  stallTimeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  cooldownMs: number;
};

export type RpcProviderContext = {
  logPrefix: string;
  failureMessage: string;
  chain: {
    chainId: number;
    name: string;
  };
  config: RpcConfig;
};

type RpcEndpoint = {
  url: string;
  failedUntil: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const shouldCooldown = (error: any): boolean => {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  if (typeof error.status === "number" && (error.status === 429 || error.status >= 500)) return true;
  if (typeof error.message === "string" && /network|fetch|timeout|Failed to fetch/i.test(error.message)) return true;
  return false;
};

export const serializeError = (error: unknown) => {
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

export class MultiRpcHttpProvider {
  private readonly endpoints: RpcEndpoint[];

  constructor(private readonly context: RpcProviderContext) {
    this.endpoints = context.config.urls.map((url) => ({ url, failedUntil: 0 }));
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
    const { config, logPrefix, failureMessage } = this.context;

    for (let attempt = 0; attempt <= config.retryCount; attempt++) {
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
            endpoint.failedUntil = Date.now() + config.cooldownMs;
            console.warn(`${logPrefix} ${endpoint.url} failed`, {
              error: serializeError(error),
              cooldownMs: config.cooldownMs,
            });
          } else {
            console.warn(`${logPrefix} ${endpoint.url} error`, serializeError(error));
          }
        }
      }

      if (attempt < config.retryCount && config.retryDelayMs > 0) {
        await sleep(config.retryDelayMs);
      }
    }

    throw lastError ?? new Error(failureMessage);
  }

  private getReadyEndpoints(): RpcEndpoint[] {
    const now = Date.now();
    const ready = this.endpoints.filter((endpoint) => endpoint.failedUntil <= now);
    return ready.length > 0 ? ready : this.endpoints;
  }

  private async sendToEndpoint(endpoint: RpcEndpoint, payload: any[]): Promise<any[]> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const { config } = this.context;

    if (config.stallTimeoutMs > 0) {
      timeout = setTimeout(() => controller.abort(), config.stallTimeoutMs);
    }

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
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

export class CircuitBreakerJsonRpcProvider extends JsonRpcProvider {
  private failedUntil = 0;

  constructor(private readonly rpcUrl: string, private readonly context: RpcProviderContext) {
    super(rpcUrl, context.chain);
  }

  override _getConnection() {
    const connection = super._getConnection();
    const { config } = this.context;
    if (config.stallTimeoutMs > 0) {
      connection.timeout = config.stallTimeoutMs;
    }
    return connection;
  }

  override async send(method: string, params: Array<any>): Promise<any> {
    const now = Date.now();
    const { config, logPrefix } = this.context;
    if (now < this.failedUntil) {
      const error = Object.assign(new Error(`RPC provider ${this.rpcUrl} cooling down`), {
        code: "RPC_COOLDOWN",
      });
      throw error;
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
        this.failedUntil = Date.now() + config.cooldownMs;
        console.warn(`${logPrefix} ${this.rpcUrl} failed`, {
          error: serializeError(error),
          cooldownMs: config.cooldownMs,
        });
      }
      throw error;
    }
  }
}

export class RetryingFallbackProvider extends FallbackProvider {
  constructor(
    configs: ConstructorParameters<typeof FallbackProvider>[0],
    quorum: number,
    private readonly context: RpcProviderContext
  ) {
    super(configs, quorum);
  }

  override async _perform(req: any): Promise<any> {
    const { config, logPrefix } = this.context;

    for (let attempt = 0; attempt <= config.retryCount; attempt++) {
      try {
        return await super._perform(req);
      } catch (error: any) {
        const transient = shouldCooldown(error) || error?.code === "RPC_COOLDOWN";
        if (!transient || attempt === config.retryCount) {
          throw error;
        }
        console.warn(`${logPrefix} retrying ${req?.method ?? "rpc"}`, {
          attempt: attempt + 1,
          error: serializeError(error),
        });
        if (config.retryDelayMs > 0) {
          await sleep(config.retryDelayMs);
        }
      }
    }
  }
}
