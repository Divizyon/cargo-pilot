import { ERPItemsTable } from '@/features/data-management/imports/components/ERPItemsTable';

export function ERPItemsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">ERP Ürünleri</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ERP'den senkronize edilen ürünleri inceleyin ve Cargo Pilot'a aktarın.
          </p>
        </div>
      </div>
      <ERPItemsTable />
    </div>
  );
}
