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
