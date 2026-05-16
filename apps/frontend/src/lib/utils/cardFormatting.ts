export const CardType = {
  Visa: 'visa',
  Mastercard: 'mastercard',
  Amex: 'amex',
  Troy: 'troy',
} as const;

export type CardType = (typeof CardType)[keyof typeof CardType];

export function detectCardType(cardNumber: string): CardType | null {
  const digits = cardNumber.replace(/\s/g, '');
  if (!digits) return null;
  if (/^9792/.test(digits)) return CardType.Troy;
  if (/^(34|37)/.test(digits)) return CardType.Amex;
  if (/^(5[1-5]|2[2-7])/.test(digits)) return CardType.Mastercard;
  if (/^4/.test(digits)) return CardType.Visa;
  return null;
}

export function formatCardNumber(rawDigits: string, cardType: CardType | null): string {
  const digits = rawDigits.replace(/\D/g, '');
  if (cardType === CardType.Amex) {
    const d = digits.slice(0, 15);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`;
  }
  return digits.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length === 1 && Number(digits) > 1) return `0${digits}/`;
  const mmDigits = digits.slice(0, 2);
  const yyDigits = digits.slice(2);
  const mm = mmDigits.length === 2 && Number(mmDigits) > 12 ? '12' : mmDigits;
  if (yyDigits.length > 0) {
    if (yyDigits.length === 2) {
      const currentYY = new Date().getFullYear() % 100;
      const yy = Number(yyDigits) < currentYY ? String(currentYY) : yyDigits;
      return `${mm}/${yy}`;
    }
    return `${mm}/${yyDigits}`;
  }
  if (mmDigits.length === 2) return `${mm}/`;
  return mm;
}
