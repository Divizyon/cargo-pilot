import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ERPItemsTable } from '@/features/data-management/imports/components/ERPItemsTable';
import { isCompanyAdminRole, useAuthStore } from '@/lib/store/useAuthStore';

function ERPAccessLocked() {
  return (
    <Alert>
      <ShieldAlert className="h-4 w-4" />
      <div className="flex flex-col items-start gap-3">
        <div>
          <p className="font-semibold">ERP ürünleri yalnızca şirket yöneticilerine açık</p>
          <AlertDescription className="mt-1 text-muted-foreground">
            ERP senkronizasyonu ve taslak onayı şirket yöneticisi yetkisi gerektirir. Erişim için
            şirket yöneticinizle iletişime geçin.
          </AlertDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Genel Bakış'a dön</Link>
        </Button>
      </div>
    </Alert>
  );
}

export function ERPItemsPage() {
  const currentUserRole = useAuthStore((s) => s.user?.role);
  // Ayarlardaki ERP sekmeleriyle aynı yetki modeli: yalnızca şirket yöneticisi.
  const canManageErp = isCompanyAdminRole(currentUserRole);

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
      {canManageErp ? <ERPItemsTable /> : <ERPAccessLocked />}
    </div>
  );
}
