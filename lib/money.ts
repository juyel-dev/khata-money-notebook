// All amounts are stored as integer paise (₹1 = 100 paise) to avoid float errors.
// This module is the ONLY place that should format money for display.

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatMoney(paise: number): string {
  return inrFormatter.format(paiseToRupees(paise));
}

// For contexts where the ₹ sign is already shown separately and we just need grouped digits
export function formatAmountPlain(paise: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    paiseToRupees(paise)
  );
}
