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

/** Üstten: yukarıdan ok + container üst yüzü */
function TruckIconTop({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="3" y="8" width="10" height="6" rx="0.5" />
      <path d="M8 1.5 v6" />
      <path d="M5.5 5.5 L8 8 L10.5 5.5" />
    </svg>
  );
}

/** Önden: soldan sağa ok + ön yüz */
function TruckIconFront({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="8" y="3" width="6" height="10" rx="0.5" />
      <path d="M1.5 8 h6" />
      <path d="M5 5.5 L7.5 8 L5 10.5" />
    </svg>
  );
}

/** Arkadan: sağdan sola ok + çift kapılı arka yüz */
function TruckIconBack({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="2" y="3" width="6" height="10" rx="0.5" />
      <line x1="5" y1="3" x2="5" y2="13" />
      <path d="M14.5 8 h-6" />
      <path d="M11 5.5 L8.5 8 L11 10.5" />
    </svg>
  );
}

/** Sağ yandan: sağdan sola ok + yan profil */
function TruckIconSideRight({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="1.5" y="4.5" width="10" height="7" rx="0.5" />
      <path d="M14.5 8 h-3" />
      <path d="M13 5.5 L11.5 8 L13 10.5" />
    </svg>
  );
}

/** Sol yandan: soldan sağa ok + yan profil */
function TruckIconSideLeft({ className }: TruckIconProps) {
  return (
    <svg className={className} {...SVG_PROPS}>
      <rect x="4.5" y="4.5" width="10" height="7" rx="0.5" />
      <path d="M1.5 8 h3" />
      <path d="M3 5.5 L4.5 8 L3 10.5" />
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
