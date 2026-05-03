import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicles } from '@/lib/api/useVehicles';
import { VehicleListTable } from '@/features/data-management/components/VehicleListTable';
import { VehicleListFilters } from '@/features/data-management/components/VehicleListFilters';
import { VehicleDeleteDialog } from '@/features/data-management/components/VehicleDeleteDialog';
import { VehicleDetailPanel } from '@/features/data-management/components/VehicleDetailPanel';
import { useVehicleFilters } from '@/features/data-management/hooks/useVehicleFilters';
import type { Vehicle } from '@/lib/types/vehicle';

export function VehiclesPage() {
  const navigate = useNavigate();
  const filterHook = useVehicleFilters();
  const { data: vehicles = [], isLoading } = useVehicles(filterHook.filters);

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [detailVehicleId, setDetailVehicleId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Araç Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yükleme planlarında kullanılacak araçları tanımlayın.
        </p>
      </div>

      <VehicleListFilters
        filters={filterHook}
        vehicles={vehicles}
        vehicleFilters={filterHook.filters}
        onCreateClick={() => navigate('/vehicles/new')}
      />

      <VehicleListTable
        vehicles={vehicles}
        isLoading={isLoading}
        onDelete={setVehicleToDelete}
        onDetail={(v) => setDetailVehicleId(v.id)}
      />

      <VehicleDeleteDialog
        vehicle={vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
      />

      <VehicleDetailPanel
        vehicleId={detailVehicleId}
        onClose={() => setDetailVehicleId(null)}
      />
    </div>
  );
}
