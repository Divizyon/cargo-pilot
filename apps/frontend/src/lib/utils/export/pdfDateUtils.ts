export type DateFormat = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export function formatDate(date: Date, format: DateFormat): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  switch (format) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    default:
      return `${dd}.${mm}.${yyyy}`;
  }
}

export function formatTimestamp(date: Date, dateFormat: DateFormat): string {
  const datePart = formatDate(date, dateFormat);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${datePart} ${hh}:${min}`;
}

/** Returns YYYYMMDD string for use as sequence key */
export function toDateKey(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${yyyy}${mm}${dd}`;
}

/** Derives a 3-letter customer code from company name (Turkish-aware). */
export function deriveCustomerCode(companyName: string): string {
  const normalized = companyName
    .replace(/[ğĞ]/g, 'G')
    .replace(/[üÜ]/g, 'U')
    .replace(/[şŞ]/g, 'S')
    .replace(/[ıİ]/g, 'I')
    .replace(/[öÖ]/g, 'O')
    .replace(/[çÇ]/g, 'C')
    .replace(/[^a-zA-Z]/g, '');
  if (!normalized) return 'USR';
  return normalized.slice(0, 3).toUpperCase().padEnd(3, 'X');
}
