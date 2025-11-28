type StoredProgress = {
  hasTokens?: boolean;
  hasBridge?: boolean;
  hasSwap?: boolean;
  lastUpdated?: number;
};

const KEY_PREFIX = "startProgress:";

const normalizeAccount = (account?: string | null) =>
  account ? account.toLowerCase() : "";

const getStorageKey = (account: string) => `${KEY_PREFIX}${account}`;

export const readStoredProgress = (account?: string | null): StoredProgress => {
  const normalized = normalizeAccount(account);
  if (!normalized) return {};

  try {
    const raw = localStorage.getItem(getStorageKey(normalized));
    if (!raw) return {};
    return JSON.parse(raw) as StoredProgress;
  } catch {
    return {};
  }
};

export const writeStoredProgress = (
  account: string | null | undefined,
  updates: Partial<StoredProgress>
) => {
  const normalized = normalizeAccount(account);
  if (!normalized) return;

  try {
    const current = readStoredProgress(normalized);
    const merged: StoredProgress = {
      ...current,
      ...updates,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(getStorageKey(normalized), JSON.stringify(merged));
  } catch (error) {
    console.warn("Failed to persist start progress", error);
  }
};

export const clearStoredProgress = (account?: string | null) => {
  const normalized = normalizeAccount(account);
  if (!normalized) return;
  try {
    localStorage.removeItem(getStorageKey(normalized));
  } catch {
    // ignore
  }
};

export type StartStepStatus =
  | "pending"
  | "loading"
  | "complete"
  | "error";

export const computeStepStatus = ({
  complete,
  loading,
  error,
}: {
  complete?: boolean;
  loading?: boolean;
  error?: string | null;
}): StartStepStatus => {
  if (loading) return "loading";
  if (error) return "error";
  return complete ? "complete" : "pending";
};
