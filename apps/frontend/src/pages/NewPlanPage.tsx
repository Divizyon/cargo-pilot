import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VehicleSelector } from '@/features/planning/components/VehicleSelector';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { usePlanStore } from '@/lib/store/usePlanStore';

export function NewPlanPage() {
  const navigate = useNavigate();
  const snapshotRef = useRef<(() => string) | null>(null);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold text-foreground">Yeni Yükleme Planı</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 border-r border-border bg-background p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Araç Tipi</span>
            <VehicleSelector />
          </div>

          {selectedVehicle && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{selectedVehicle.name}</p>
              <p className="mt-1">
                {selectedVehicle.length} × {selectedVehicle.width} × {selectedVehicle.height} cm
              </p>
              <p>Maks. yük: {selectedVehicle.payload.toLocaleString('tr-TR')} kg</p>
            </div>
          )}
        </aside>

        {/* 3D viewport */}
        <main className="relative flex-1 bg-muted/20">
          {!selectedVehicle && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Başlamak için bir araç tipi seçin</p>
            </div>
          )}
          <PlanCanvas snapshotRef={snapshotRef} />
        </main>
      </div>
    </div>
  );
}
