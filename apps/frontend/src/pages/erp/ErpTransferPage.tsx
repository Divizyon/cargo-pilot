import { Navigate, useNavigate } from 'react-router-dom';
import { BulkImportDialog } from '@/features/data-management/imports/components/BulkImportDialog';
import { ERP_TERM } from '@/lib/config/erpTerms';
import { useErpTransferStore } from '@/lib/store/useErpTransferStore';

/**
 * ERP taslaklarının ürüne dönüştüğü düzenleme ekranı. Ürün ve araç ekleme
 * sayfalarıyla aynı kabuk: başlık bloğu, kalan alanı dolduran kart, kartın üzerinde
 * yüzen aksiyon çubuğu.
 *
 * Aktarılacak satırlar listeden `useErpTransferStore` ile taşınır; adresin doğrudan
 * açılması hâlinde aktarılacak bir şey yoktur ve kullanıcı listeye döner.
 */
export function ErpTransferPage() {
  const navigate = useNavigate();
  const rows = useErpTransferStore((s) => s.rows);
  const draftItemIds = useErpTransferStore((s) => s.draftItemIds);
  const mode = useErpTransferStore((s) => s.mode);
  const clearTransfer = useErpTransferStore((s) => s.clear);

  if (rows.length === 0) return <Navigate to="/erp" replace />;

  const isUpdate = mode === 'update';

  /** Hem iptalde hem başarılı aktarımda çalışır; ikisi de listeye döner. */
  function handleLeave() {
    clearTransfer();
    navigate('/erp');
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {isUpdate ? 'ERP Güncellemeyi Onayla' : ERP_TERM.approve}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hücreleri tıklayarak doğrudan düzenleyin. Kırmızı alanları düzeltin, ardından ürünlere
            aktarın.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <BulkImportDialog
          asPage
          open
          onOpenChange={(next) => {
            if (!next) handleLeave();
          }}
          initialRows={rows}
          draftItemIds={draftItemIds}
          mode={mode}
        />
      </div>
    </div>
  );
}
