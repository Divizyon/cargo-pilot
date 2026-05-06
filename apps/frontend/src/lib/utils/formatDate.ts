import type { DateFormat } from '@/lib/store/useUnitStore';

export function formatDate(iso: string | Date, format: DateFormat, includeTime = false): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());

  let dateStr: string;
  switch (format) {
    case 'DD.MM.YYYY':
      dateStr = `${day}.${month}.${year}`;
      break;
    case 'MM/DD/YYYY':
      dateStr = `${month}/${day}/${year}`;
      break;
    case 'YYYY-MM-DD':
      dateStr = `${year}-${month}-${day}`;
      break;
  }

  if (!includeTime) return dateStr;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Returns the cell value for an Excel export date cell.
 * When format is YYYY-MM-DD, returns a Date object so SheetJS writes a native
 * Excel date type (required for pivot tables and sorting to work correctly).
 * For other formats, returns a pre-formatted string.
 */
export function getExcelDateCellValue(date: Date, format: DateFormat): Date | string {
  if (format === 'YYYY-MM-DD') return date;
  return formatDate(date, format);
}
