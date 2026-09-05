// All amounts are stored as integer paise (₹1 = 100 paise) to avoid float errors.
// This module is the ONLY place that should format money for display.

// Hard ceiling on any single amount (opening balance or one transaction).
// This is generous for any real shop/personal ledger (~10 crore rupees) while
// guarding against two real problems that showed up in testing:
// 1. A mistyped or pasted huge number silently getting accepted, then
//    rendering as JS scientific notation ("1e+55") in a form field, or as a
//    50+ digit string that overflows the balance header / person-row layout.
// 2. Numbers past ~1e15 losing precision as JS doubles, which then display
//    as garbage-looking padded digits rather than the number the person
//    actually intended.
export const MAX_AMOUNT_RUPEES = 999_999_999; // ₹99,99,99,999
const MAX_AMOUNT_PAISE = MAX_AMOUNT_RUPEES * 100;

function clampPaise(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  const sign = paise < 0 ? -1 : 1;
  return sign * Math.min(Math.abs(paise), MAX_AMOUNT_PAISE);
}

export function clampRupeesInput(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  const sign = rupees < 0 ? -1 : 1;
  return sign * Math.min(Math.abs(rupees), MAX_AMOUNT_RUPEES);
}

export function rupeesToPaise(rupees: number): number {
  return clampPaise(Math.round(rupees * 100));
}

export function paiseToRupees(paise: number): number {
  return clampPaise(paise) / 100;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Defensive clamp here too: even if a value already in storage predates this
// limit (or was written some other way), display can never overflow the UI.
export function formatMoney(paise: number): string {
  return inrFormatter.format(paiseToRupees(clampPaise(paise)));
}

// For contexts where the ₹ sign is already shown separately and we just need grouped digits
export function formatAmountPlain(paise: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    paiseToRupees(clampPaise(paise))
  );
}

// Safe for populating a plain-text <input> from a stored value — never
// renders scientific notation, unlike a bare String(number).
export function rupeesInputValue(paise: number): string {
  const rupees = paiseToRupees(clampPaise(paise));
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}
