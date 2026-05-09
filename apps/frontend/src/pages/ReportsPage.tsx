import { ReportsTable } from '@/features/platform/components/ReportsTable';

export function ReportsPage() {
  function handleBulkDownload(from: string, to: string) {
    // placeholder — backend entegrasyonunda gerçek export tetiklenecek
    console.info('Dönemsel rapor indiriliyor:', { from, to });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Raporlar</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Geçmiş yükleme planlarını filtrele, incele ve dışa aktar.
        </p>
      </div>

      <ReportsTable onBulkDownload={handleBulkDownload} />
    </div>
  );
}
