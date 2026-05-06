import { useNavigate } from 'react-router-dom';
import { VehicleTable } from '@/features/data-management/components/VehicleTable';

export function VehiclesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Araç Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yükleme planlarında kullanılacak araçları tanımlayın.
        </p>
      </div>

      <VehicleTable onCreateClick={() => navigate('/vehicles/new')} />
    </div>
  );
}
