import { useEffect, useState } from 'react';
import { Eye, EyeOff, Layers } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { SCENE } from '@/lib/config/scene-config';

interface LevelControlsProps {
  className?: string;
}

export function LevelControls({ className }: LevelControlsProps) {
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const setActiveLayer = useSceneStore((s) => s.setActiveLayer);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const toggleXRayMode = useSceneStore((s) => s.toggleXRayMode);

  // Local state sürükleme sırasında slider'ı anlık günceller;
  // debounce ile store'a yazılır → instanceMatrix.needsUpdate gereksiz tetiklenmez.
  // key={vehicle.id} ile parent bu bileşeni yeniden mount eder → state otomatik sıfırlanır.
  const [localValue, setLocalValue] = useState(0);
  const debouncedValue = useDebounce(localValue, 80);

  // Debounced değer değişince store'a yaz
  useEffect(() => {
    setActiveLayer(debouncedValue);
  }, [debouncedValue, setActiveLayer]);

  if (!vehicle) return null;

  const max = vehicle.length;
  const pct = max > 0 ? Math.round((localValue / max) * 100) : 0;

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur',
          className,
        )}
      >
        {/* X-Ray toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleXRayMode}
              aria-pressed={xRayMode}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                xRayMode
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
              )}
            >
              {xRayMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {xRayMode ? 'X-Ray kapat' : 'X-Ray aç (ihlalleri vurgula)'}
          </TooltipContent>
        </Tooltip>

        {/* Depth slider label */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 shrink-0">
              <Layers className="h-3 w-3" />
              <span className="w-8 tabular-nums">{pct > 0 ? `${pct}%` : 'Hepsi'}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Derinlik ghost filtresi (Z ekseni)</TooltipContent>
        </Tooltip>

        {/* Horizontal depth slider — 0=hepsi normal, max=hepsi ghost */}
        <Slider
          orientation="horizontal"
          min={0}
          max={max}
          step={SCENE.LEVEL_FILTER_STEP_CM}
          value={[localValue]}
          onValueChange={(values: number[]) => setLocalValue(values[0])}
          aria-label="Derinlik ghost filtresi"
          className="w-32"
        />
      </div>
    </TooltipProvider>
  );
}
