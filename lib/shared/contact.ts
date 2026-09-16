// tel: and wa.me deep links for a person's phone number.
export function telLink(phone: string): string {
  return `tel:${phone.trim()}`;
}

// wa.me needs digits only (no +, spaces, or dashes). This does not add a
// country code if the stored number doesn't have one — WhatsApp will show
// its own "invalid number" state in that case rather than us guessing a
// country to prepend.
export function waLink(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}`;
}
