import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Box,
  Crosshair,
  Eye,
  Layers,
  MoveLeft,
  MoveRight,
  DoorOpen,
  Undo2,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE, type CameraPreset } from '@/lib/config/scene-config';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  calcCenterOfGravity,
  calcBalance,
  buildCogInputs,
} from '@/lib/utils/geometry/calcCenterOfGravity';

const PRESETS: { key: CameraPreset; icon: typeof Box }[] = [
  { key: 'TOP', icon: ArrowDownToLine },
  { key: 'FRONT', icon: DoorOpen },
  { key: 'BACK', icon: Undo2 },
  { key: 'SIDE_RIGHT', icon: MoveRight },
  { key: 'SIDE_LEFT', icon: MoveLeft },
  { key: 'ISO', icon: Box },
];

type OpenPanel = 'xray' | 'cog' | null;

interface CameraPresetButtonsProps {
  className?: string;
}

export function CameraPresetButtons({ className }: CameraPresetButtonsProps) {
  const cameraPreset = useSceneStore((s) => s.cameraPreset);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);
  const setActiveLayer = useSceneStore((s) => s.setActiveLayer);
  const showCog = useSceneStore((s) => s.showCog);
  const toggleShowCog = useSceneStore((s) => s.toggleShowCog);

  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  // ── Uzunluk filtresi (X-Ray popover) ───────────────────────────────────────
  const [sliderValue, setSliderValue] = useState(0);
  const debouncedSlider = useDebounce(sliderValue, 80);
  const sliderMax = vehicle?.length ?? 100;
  const sliderPct = sliderMax > 0 ? Math.round((sliderValue / sliderMax) * 100) : 0;

  useEffect(() => {
    setActiveLayer(debouncedSlider);
  }, [debouncedSlider, setActiveLayer]);

  // Reset slider when vehicle changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSliderValue(0);
  }, [vehicle?.id]);

  // ── Ağırlık merkezi (CoG popover) ─────────────────────────────────────────
  const balance = useMemo(() => {
    if (!vehicle || placements.length === 0) return null;
    const weightByItemId: Record<string, number> = {};
    for (const { item } of selectedItems) {
      weightByItemId[item.id] = item.weight;
    }
    const inputs = buildCogInputs(
      placements.filter((p) => !p.isStagingArea),
      weightByItemId,
    );
    const cog = calcCenterOfGravity(inputs);
    if (!cog) return null;
    return calcBalance(cog, vehicle.width, vehicle.length);
  }, [placements, selectedItems, vehicle]);

  function togglePanel(panel: 'xray' | 'cog') {
    if (panel === 'cog') {
      // İkon: showCog'u toggle eder.
      // Kapalıysa → aç + popover'ı da aç.
      // Açıksa → kapat + popover'ı da kapat.
      toggleShowCog();
      setOpenPanel((prev) => (prev === 'cog' ? null : 'cog'));
    } else {
      setOpenPanel((prev) => (prev === panel ? null : panel));
    }
  }

  // X butonu: sadece popover'ı kapatır, showCog (nokta) açık kalır.
  function closePopover() {
    setOpenPanel(null);
  }

  return (
    <div
      className={cn(
        'w-full flex items-center gap-px rounded-xl bg-background px-1.5 py-1.5 border border-border text-foreground',
        className,
      )}
    >
      {/* X-Ray popover */}
      <Popover
        open={openPanel === 'xray'}
        onOpenChange={(o: boolean) => setOpenPanel(o ? 'xray' : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={() => togglePanel('xray')}
            title="X-Ray / Uzunluk Filtresi"
            aria-label="X-Ray / Uzunluk Filtresi"
            aria-pressed={openPanel === 'xray'}
            className={cn(
              'h-8 w-8 shrink-0 flex items-center justify-center rounded-md transition-colors',
              openPanel === 'xray'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              <span>Uzunluk Filtresi</span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {sliderPct > 0 ? `${sliderPct}%` : 'Hepsi'}
            </span>
          </div>
          <Slider
            min={0}
            max={sliderMax}
            step={SCENE.LEVEL_FILTER_STEP_CM}
            value={[sliderValue]}
            onValueChange={(values: number[]) => setSliderValue(values[0])}
            disabled={!vehicle}
          />
          {!vehicle && (
            <p className="text-[10px] text-muted-foreground">Araç seçilmeden kullanılamaz</p>
          )}
        </PopoverContent>
      </Popover>

      {/* Ağırlık Merkezi popover */}
      <Popover
        open={openPanel === 'cog'}
        onOpenChange={(o: boolean) => {
          if (!o) closePopover();
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={() => togglePanel('cog')}
            title="Ağırlık Merkezi"
            aria-label="Ağırlık Merkezi"
            aria-pressed={showCog}
            className={cn(
              'h-8 w-8 shrink-0 flex items-center justify-center rounded-md transition-colors',
              showCog
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-56 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Araç Dengesi
            </p>
            <button
              type="button"
              onClick={closePopover}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Kapat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {!balance ? (
            <p className="text-xs text-muted-foreground">
              {placements.length === 0 ? 'Henüz yükleme yapılmadı.' : 'Araç seçilmedi.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p
                className={cn(
                  'text-xs font-medium',
                  balance.isLateralWarning || balance.isLongitudinalWarning
                    ? 'text-destructive'
                    : 'text-emerald-500',
                )}
              >
                {balance.isLateralWarning || balance.isLongitudinalWarning
                  ? '⚠ Denge ihlali var'
                  : '✓ Denge ihlali yok'}
              </p>
              <div className="border-t border-border pt-2 flex flex-col gap-1">
                {/*
                  Her satır kendi ekseninden okunur: sağ/sol yalnızca x, ön/arka
                  yalnızca z. Önceden iki satır da z tabanlı aks payını gösteriyordu,
                  yani lateral denge hiç görünmüyordu.
                */}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sol / Sağ Yük Dağılımı</span>
                  <span className="tabular-nums">
                    {(balance.leftShare * 100).toFixed(1)}% /{' '}
                    {(balance.rightShare * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ön / Arka Aks Yükü</span>
                  <span className="tabular-nums">
                    {(balance.frontAxleShare * 100).toFixed(1)}% /{' '}
                    {(balance.rearAxleShare * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

      {/* Kamera presetleri */}
      {PRESETS.map(({ key, icon: Icon }) => {
        const active = cameraPreset === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setCameraPreset(key)}
            title={SCENE.CAMERA_PRESETS[key].label}
            aria-label={SCENE.CAMERA_PRESETS[key].label}
            aria-pressed={active}
            className={cn(
              'flex-1 h-8 flex items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
