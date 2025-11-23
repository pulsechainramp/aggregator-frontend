import { ethers } from "ethers";

export function normalizeAmountInput(amount: string): string {
  const normalized = amount?.trim() ?? "";
  if (!normalized) {
    throw new Error("Amount is required");
  }
  if (normalized === "." || normalized === "-") {
    throw new Error("Invalid amount");
  }
  return normalized;
}

export function areAmountsEqual(a: string | null | undefined, b: string): boolean {
  const left = a?.trim() ?? "";
  return left !== "" && left === b;
}

export function parseAmountToWei(amount: string, decimals: number): bigint {
  return ethers.parseUnits(normalizeAmountInput(amount), decimals);
}

export function tryParseAmountToWei(
  amount: string | null | undefined,
  decimals: number
): bigint | null {
  if (!amount) return null;
  try {
    return parseAmountToWei(amount, decimals);
  } catch {
    return null;
  }
}

export function isPositiveAmount(
  amount: string | null | undefined,
  decimals: number
): boolean {
  const wei = tryParseAmountToWei(amount, decimals);
  return wei !== null && wei > 0n;
}

export function compareAmountStrings(
  a: string | null | undefined,
  b: string | null | undefined,
  decimals: number
): number | null {
  const left = tryParseAmountToWei(a, decimals);
  const right = tryParseAmountToWei(b, decimals);
  if (left === null || right === null) return null;
  if (left === right) return 0;
  return left > right ? 1 : -1;
}

export function truncateToDecimals(value: string, decimals: number): string {
  if (value === "") return "";
  const safeDecimals = Number.isFinite(decimals) ? Math.max(0, decimals) : 0;

  if (safeDecimals === 0) {
    const integer = value.split(".")[0];
    return integer ?? "";
  }

  const dotIndex = value.indexOf(".");
  if (dotIndex === -1) {
    return value;
  }

  const integerRaw = value.slice(0, dotIndex);
  const integer = integerRaw === "" ? "0" : integerRaw;
  const fraction = value.slice(dotIndex + 1);
  if (fraction.length === 0) {
    return integer;
  }
  if (fraction.length <= safeDecimals) {
    return `${integer}.${fraction}`;
  }

  return `${integer}.${fraction.slice(0, safeDecimals)}`;
}

export function formatWeiAmount(
  value: bigint | string,
  decimals: number
): string {
  const asBigInt =
    typeof value === "bigint" ? value : BigInt(value);
  return ethers.formatUnits(asBigInt, decimals);
}
