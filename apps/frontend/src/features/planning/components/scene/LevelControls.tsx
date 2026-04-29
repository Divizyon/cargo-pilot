import { useEffect } from 'react';
import { Eye, EyeOff, Layers } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';

interface LevelControlsProps {
  className?: string;
}

export function LevelControls({ className }: LevelControlsProps) {
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const activeLayer = useSceneStore((s) => s.activeLayer);
  const setActiveLayer = useSceneStore((s) => s.setActiveLayer);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const toggleXRayMode = useSceneStore((s) => s.toggleXRayMode);

  // Vehicle değiştiğinde activeLayer'ı tavana resetle (limitsiz "hepsi görünür").
  useEffect(() => {
    setActiveLayer(Number.POSITIVE_INFINITY);
  }, [vehicle?.id, setActiveLayer]);

  if (!vehicle) return null;

  const max = vehicle.height;
  const sliderValue = Number.isFinite(activeLayer) ? Math.min(activeLayer, max) : max;

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          'pointer-events-auto flex flex-col items-center gap-2 rounded-lg border border-zinc-200 bg-white/90 p-2 shadow-sm backdrop-blur',
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleXRayMode}
              aria-pressed={xRayMode}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                xRayMode
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
              )}
            >
              {xRayMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {xRayMode ? 'Ghost mod açık (X-Ray)' : 'Ghost modu aç'}
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Layers className="h-3 w-3" />
          <span>{Number.isFinite(activeLayer) ? `${Math.round(sliderValue)} cm` : 'Hepsi'}</span>
        </div>

        <div className="flex h-48 items-center justify-center">
          <Slider
            orientation="vertical"
            min={0}
            max={max}
            step={SCENE.LEVEL_FILTER_STEP_CM}
            value={[sliderValue]}
            onValueChange={(values) => {
              const next = values[0];
              // Slider tavanda → +Infinity (default); altındaysa kullanıcı limit koymuş.
              setActiveLayer(next >= max ? Number.POSITIVE_INFINITY : next);
            }}
            aria-label="Yükseklik filtresi"
          />
        </div>

        <span className="text-[10px] text-zinc-400">0</span>
      </div>
    </TooltipProvider>
  );
}
