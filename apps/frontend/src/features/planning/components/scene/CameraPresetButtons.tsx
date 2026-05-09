import { useState, useEffect, useRef } from 'react';
import {
  ArrowDownToLine,
  Box,
  MoveLeft,
  MoveRight,
  DoorOpen,
  Undo2,
  Crosshair,
  Eye,
  EyeOff,
  Activity,
  Printer,
  Loader2,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE, type CameraPreset } from '@/lib/config/scene-config';
import { exportPlanToPdf } from '@/lib/utils/exportPlanToPdf';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { cn } from '@/lib/utils';

const PRESETS: { key: CameraPreset; icon: typeof Box }[] = [
  { key: 'TOP', icon: ArrowDownToLine },
  { key: 'FRONT', icon: DoorOpen },
  { key: 'BACK', icon: Undo2 },
  { key: 'SIDE_RIGHT', icon: MoveRight },
  { key: 'SIDE_LEFT', icon: MoveLeft },
  { key: 'ISO', icon: Box },
];

interface CameraPresetButtonsProps {
  className?: string;
  getSnapshot?: () => string;
}

export function CameraPresetButtons({ className, getSnapshot }: CameraPresetButtonsProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [xrayOpen, setXrayOpen] = useState(false);
  const xrayPanelRef = useRef<HTMLDivElement>(null);

  const cameraPreset = useSceneStore((s) => s.cameraPreset);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);
  const showCog = useSceneStore((s) => s.showCog);
  const toggleShowCog = useSceneStore((s) => s.toggleShowCog);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const toggleXRayMode = useSceneStore((s) => s.toggleXRayMode);
  const stressTestMode = useSceneStore((s) => s.stressTestMode);
  const toggleStressTestMode = useSceneStore((s) => s.toggleStressTestMode);
  const setActiveLayer = useSceneStore((s) => s.setActiveLayer);

  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);

  const [sliderValue, setSliderValue] = useState(0);
  const debouncedSlider = useDebounce(sliderValue, 80);

  useEffect(() => {
    setActiveLayer(debouncedSlider);
  }, [debouncedSlider, setActiveLayer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSliderValue(0);
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (!xrayOpen) return;
    function handleOutside(e: MouseEvent) {
      if (xrayPanelRef.current && !xrayPanelRef.current.contains(e.target as Node)) {
        setXrayOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [xrayOpen]);

  async function handlePdfExport() {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      await exportPlanToPdf({
        planId: crypto.randomUUID(),
        placements,
        items: selectedItems.map((si) => si.item),
        vehicle: selectedVehicle,
        snapshotDataUrl: getSnapshot?.(),
      });
    } finally {
      setIsPdfLoading(false);
    }
  }

  const sliderMax = selectedVehicle?.length ?? 100;
  const sliderPct = sliderMax > 0 ? Math.round((sliderValue / sliderMax) * 100) : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg bg-white/90 p-1 backdrop-blur border border-zinc-200 text-zinc-700',
        className,
      )}
    >
      {/* Aksiyon butonları */}
      <Button
        type="button"
        size="sm"
        variant={showCog ? 'default' : 'ghost'}
        onClick={toggleShowCog}
        title="Ağırlık Merkezi"
        aria-label="Ağırlık Merkezi"
        aria-pressed={showCog}
      >
        <Crosshair className="h-4 w-4" />
      </Button>

      {/* X-Ray butonu + floating panel */}
      <div ref={xrayPanelRef} className="relative">
        <Button
          type="button"
          size="sm"
          variant={xRayMode || xrayOpen ? 'default' : 'ghost'}
          onClick={() => setXrayOpen((v) => !v)}
          title="X-Ray Modu"
          aria-label="X-Ray Modu"
          aria-pressed={xrayOpen}
        >
          {xRayMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>

        {xrayOpen && (
          <div className="absolute top-full right-0 mt-1.5 z-50 w-60 rounded-xl border border-zinc-200 bg-white shadow-lg p-3 flex flex-col gap-3">
            {/* X-Ray toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700">X-Ray Modu</span>
              <button
                type="button"
                onClick={toggleXRayMode}
                aria-pressed={xRayMode}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors',
                  xRayMode
                    ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-700'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50',
                )}
              >
                {xRayMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {xRayMode ? 'Kapat' : 'Aç'}
              </button>
            </div>

            {/* Derinlik filtresi */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Derinlik Filtresi</span>
                </div>
                <span className="text-xs tabular-nums text-zinc-600">
                  {sliderPct > 0 ? `${sliderPct}%` : 'Hepsi'}
                </span>
              </div>
              <Slider
                min={0}
                max={sliderMax}
                step={SCENE.LEVEL_FILTER_STEP_CM}
                value={[sliderValue]}
                onValueChange={(values: number[]) => setSliderValue(values[0])}
                aria-label="Derinlik ghost filtresi"
                disabled={!selectedVehicle}
              />
              {!selectedVehicle && (
                <p className="text-[10px] text-zinc-400">Araç seçilmeden kullanılamaz</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant={stressTestMode ? 'default' : 'ghost'}
        onClick={toggleStressTestMode}
        title="Stres Testi"
        aria-label="Stres Testi"
        aria-pressed={stressTestMode}
      >
        <Activity className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handlePdfExport}
        disabled={isPdfLoading || placements.length === 0}
        title="PDF Al"
        aria-label="PDF Al"
      >
        {isPdfLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
      </Button>

      {/* Ayraç */}
      <div className="w-px self-stretch bg-zinc-200 mx-0.5" />

      {/* Kamera preset butonları */}
      {PRESETS.map(({ key, icon: Icon }) => {
        const active = cameraPreset === key;
        return (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={active ? 'default' : 'ghost'}
            onClick={() => setCameraPreset(key)}
            title={SCENE.CAMERA_PRESETS[key].label}
            aria-label={SCENE.CAMERA_PRESETS[key].label}
            aria-pressed={active}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
