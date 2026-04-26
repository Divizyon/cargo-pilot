import { ArrowDownToLine, Box, MoveRight, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE, type CameraPreset } from '@/lib/config/scene-config';
import { cn } from '@/lib/utils';

const PRESETS: { key: CameraPreset; icon: typeof Box }[] = [
  { key: 'TOP',   icon: ArrowDownToLine },
  { key: 'FRONT', icon: Square },
  { key: 'SIDE',  icon: MoveRight },
  { key: 'ISO',   icon: Box },
];

export function CameraPresetButtons({ className }: { className?: string }) {
  const cameraPreset = useSceneStore((s) => s.cameraPreset);
  const setCameraPreset = useSceneStore((s) => s.setCameraPreset);

  return (
    <div className={cn('flex gap-1.5 rounded-lg bg-white/90 p-1 shadow-md backdrop-blur', className)}>
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
            <span className="hidden text-xs sm:inline">
              {SCENE.CAMERA_PRESETS[key].label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
