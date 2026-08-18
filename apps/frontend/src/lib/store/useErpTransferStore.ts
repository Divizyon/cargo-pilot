import { create } from 'zustand';
import type { EditableRow } from '@/features/data-management/imports/components/BulkImportDialog';

export type ErpTransferMode = 'import' | 'update';

interface ErpTransferPayload {
  /** Aktarım ekranında düzenlenecek satırlar. */
  rows: EditableRow[];
  /** row._id → taslak kaydın backend kimliği; onay bu eşlemeyle yapılır. */
  draftItemIds: Record<string, string>;
  mode: ErpTransferMode;
}

interface ErpTransferStore extends ErpTransferPayload {
  start: (payload: ErpTransferPayload) => void;
  clear: () => void;
}

const EMPTY: ErpTransferPayload = { rows: [], draftItemIds: {}, mode: 'import' };

/**
 * ERP taslaklarının aktarım ekranına taşınmasını sağlar.
 *
 * Aktarım modalken bu veri prop olarak geçiyordu; rota kabuğunda gezinme listeyi
 * söktüğü için seçim bellekte kalamıyor. Store yalnızca kullanıcının seçimini ve
 * düzenlediği form modelini tutar — taslak kayıtlarının kendisi TanStack Query
 * cache'inde kalır, buraya kopyalanmaz.
 *
 * Kalıcı depoya **yazılmaz**. Kısmi aktarımda başarılı satırlar sunucuda onaylanır ve
 * ekrandaki liste kalanlara düşer; store bunu takip etmediği için kalıcı bir kopya,
 * yenilemeden sonra zaten aktarılmış satırların tekrar gönderilmesine yol açardı.
 * Yenilemede seçim kaybolur ve sayfa listeye döner — aktarım modalken de böyleydi.
 */
export const useErpTransferStore = create<ErpTransferStore>((set) => ({
  ...EMPTY,
  start: (payload) => set(payload),
  clear: () => set(EMPTY),
}));
