import { formatDate } from '@/lib/utils/formatDate';
import type { DateFormat } from '@/lib/store/useUnitStore';

export function formatAuditDate(iso: string, format: DateFormat, includeTime = false): string {
  return formatDate(iso, format, includeTime);
}
