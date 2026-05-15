import { useState, useRef } from 'react';
import {
  Box,
  Crosshair,
  Eye,
  EyeOff,
  Activity,
  Printer,
  Loader2,
  Layers,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE, type CameraPreset } from '@/lib/config/scene-config';
import { cn } from '@/lib/utils';
import { useExportPlanToERP } from '@/lib/api/useLoadingPlans';

// ─── Truck-view SVG icons ─────────────────────────────────────────────────────

interface TruckIconProps {
  className?: string;
}

const SVG_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 16 16',
};

function TruckIconTop({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="4" y="1" width="8" height="14" rx="1" />
      <line x1="4" y1="11" x2="12" y2="11" />
      <rect x="1.5" y="12" width="2.5" height="2" rx="0.4" />
      <rect x="12" y="12" width="2.5" height="2" rx="0.4" />
    </svg>
  );
}

function TruckIconFront({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="1" y="2" width="14" height="12" rx="1" />
      <rect x="2.5" y="3" width="11" height="5" rx="0.5" />
      <line x1="1" y1="9.5" x2="15" y2="9.5" />
      <rect x="1.5" y="10.5" width="3" height="2.5" rx="0.5" />
      <rect x="11.5" y="10.5" width="3" height="2.5" rx="0.5" />
    </svg>
  );
}

function TruckIconBack({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="1" y="2" width="14" height="12" rx="1" />
      <line x1="8" y1="2" x2="8" y2="14" />
      <rect x="1.5" y="2.5" width="2" height="3.5" rx="0.5" />
      <rect x="12.5" y="2.5" width="2" height="3.5" rx="0.5" />
      <rect x="5.5" y="11.5" width="5" height="2" rx="0.5" />
    </svg>
  );
}

function TruckIconSideRight({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <path d="M1 11 V6 L4.5 1.5 H15 V11 Z" />
      <line x1="5" y1="1.5" x2="5" y2="11" />
      <circle cx="3" cy="13.5" r="1.8" />
      <circle cx="12" cy="13.5" r="1.8" />
    </svg>
  );
}

function TruckIconSideLeft({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <path d="M15 11 V6 L11.5 1.5 H1 V11 Z" />
      <line x1="11" y1="1.5" x2="11" y2="11" />
      <circle cx="13" cy="13.5" r="1.8" />
      <circle cx="4" cy="13.5" r="1.8" />
    </svg>
  );
}

// ─── Preset list ──────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;

const PRESETS: { key: CameraPreset; icon: IconComponent }[] = [
  { key: 'TOP', icon: TruckIconTop },
  { key: 'FRONT', icon: TruckIconFront },
  { key: 'BACK', icon: TruckIconBack },
  { key: 'SIDE_RIGHT', icon: TruckIconSideRight },
  { key: 'SIDE_LEFT', icon: TruckIconSideLeft },
  { key: 'ISO', icon: Box },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CameraPresetButtonsProps {
  className?: string;
  getSnapshot?: () => string;
  planId?: string;
}

export function CameraPresetButtons({ className, getSnapshot, planId }: CameraPresetButtonsProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { mutate: exportToERP, isPending: isExporting } = useExportPlanToERP();
  const [xrayOpen, setXrayOpen] = useState(false);
  const xrayPanelRef = useRef<HTMLDivElement>(null);
  const [sliderValue, setSliderValue] = useState(0);

  const cameraPreset = useSceneStore((s) => s.cameraPreset);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);
  const showCog = useSceneStore((s) => s.showCog);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const stressTestMode = useSceneStore((s) => s.stressTestMode);
  const toggleShowCog = useSceneStore((s) => s.toggleShowCog);
  const toggleXRayMode = useSceneStore((s) => s.toggleXRayMode);
  const toggleStressTestMode = useSceneStore((s) => s.toggleStressTestMode);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const placements = usePlanStore((s) => s.placements);

  const sliderMax = selectedVehicle?.length ?? 0;
  const sliderPct = sliderMax > 0 ? Math.round((sliderValue / sliderMax) * 100) : 0;

  const handlePdfExport = async () => {
    if (!getSnapshot) return;
    setIsPdfLoading(true);
    try {
      const dataUrl = getSnapshot();
      if (dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `cargo-plan-${Date.now()}.png`;
        a.click();
      }
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center rounded-xl bg-white px-2 py-1.5 border border-zinc-200 text-zinc-700',
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
        onClick={() => void handlePdfExport()}
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

      {planId && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => exportToERP(planId)}
          disabled={isExporting || placements.length === 0}
          title="ERP'ye Aktar"
          aria-label="ERP'ye Aktar"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      )}

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
            className="flex-1"
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
