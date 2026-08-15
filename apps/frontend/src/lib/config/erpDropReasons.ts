import { ErpDropReason, type DroppedByReason } from '@/lib/types/erp';

/**
 * Backend ErpDropReason anahtarlarının kullanıcıya gösterilen karşılıkları.
 * Sözlük tek kaynaktır: toast ve senkronizasyon geçmişi aynı metni kullanır.
 */
export const DROP_REASON_LABEL: Record<ErpDropReason, string> = {
  [ErpDropReason.SalesLocked]: 'Satış kilitli',
  [ErpDropReason.CategoryFiltered]: 'Kategori filtresi',
  [ErpDropReason.WarehouseFiltered]: 'Depo filtresi',
  [ErpDropReason.RowLimitExceeded]: 'Satır limiti aşıldı',
  [ErpDropReason.DuplicateErpId]: 'Tekrar eden ERP kaydı',
};

/**
 * Kullanıcının kendi seçtiği filtreyle elenen satırlar sorun değil bilgidir;
 * arayüzde 'atlandı' yerine 'filtrelendi' dilinde raporlanır.
 */
const FILTER_DROP_REASONS = new Set<string>([
  ErpDropReason.CategoryFiltered,
  ErpDropReason.WarehouseFiltered,
]);

export function isFilterDropReason(reason: string): boolean {
  return FILTER_DROP_REASONS.has(reason);
}

/** Bilinmeyen anahtar backend'de yeni bir neden eklendiği anlamına gelir; ham hâliyle gösterilir. */
export function dropReasonLabel(reason: string): string {
  return DROP_REASON_LABEL[reason as ErpDropReason] ?? reason;
}

export interface DropReasonBreakdownRow {
  reason: string;
  label: string;
  count: number;
  isFilter: boolean;
}

export interface DropAccounting {
  /** Kullanıcı filtresiyle elenen satır toplamı. */
  filtered: number;
  /** Filtre dışı nedenlerle (satış kilidi, limit, tekrar) elenen satır toplamı. */
  dropped: number;
  rows: DropReasonBreakdownRow[];
}

/** Sayısı sıfır olan nedenler gösterilmez; kalanlar büyükten küçüğe sıralanır. */
export function summarizeDrops(droppedByReason: DroppedByReason): DropAccounting {
  const rows = Object.entries(droppedByReason)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({
      reason,
      label: dropReasonLabel(reason),
      count,
      isFilter: isFilterDropReason(reason),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    filtered: rows.filter((r) => r.isFilter).reduce((sum, r) => sum + r.count, 0),
    dropped: rows.filter((r) => !r.isFilter).reduce((sum, r) => sum + r.count, 0),
    rows,
  };
}
