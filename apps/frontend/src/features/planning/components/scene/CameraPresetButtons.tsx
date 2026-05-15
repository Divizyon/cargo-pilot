import { Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE, type CameraPreset } from '@/lib/config/scene-config';
import { cn } from '@/lib/utils';

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

/** Üstten: araç tepe görünümü (portrat, ön altta, dikiz aynalı) */
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

/** Önden: ön tampon, ön cam, farlar */
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

/** Arkadan: arka kapılar, stop lambaları, plaka */
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

/** Sağdan: sağ yan profil — kabin solda (ön), kasa sağda (arka) */
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

/** Soldan: sol yan profil — kabin sağda (ön), kasa solda (arka) */
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
}

export function CameraPresetButtons({ className }: CameraPresetButtonsProps) {
  const cameraPreset = useSceneStore((s) => s.cameraPreset);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);

  return (
    <div
      className={cn(
        'w-full flex items-center rounded-xl bg-white px-2 py-1.5 border border-zinc-200 text-zinc-700',
        className,
      )}
    >
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
