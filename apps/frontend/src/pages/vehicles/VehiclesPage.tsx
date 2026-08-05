import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { VehicleTable } from '@/features/data-management/vehicles/components/VehicleTable';
import { useUsageQuota, isQuotaExceeded } from '@/lib/api/useUsageQuota';

export function VehiclesPage() {
  const navigate = useNavigate();
  const { data: quota } = useUsageQuota();

  function handleCreateClick() {
    if (quota && isQuotaExceeded(quota.vehicles)) {
      toast.error('Plan limitinize ulaştınız. Planınızı yükseltin.', { position: 'bottom-right' });
      return;
    }
    navigate('/vehicles/new');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Araç Yönetimi</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Yükleme planlarında kullanılacak araçları tanımlayın.
          </p>
        </div>
      </div>

      <VehicleTable onCreateClick={handleCreateClick} />
    </div>
  );
}
