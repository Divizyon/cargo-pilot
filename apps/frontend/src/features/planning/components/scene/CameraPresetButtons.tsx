import { ArrowDownToLine, Box, MoveLeft, MoveRight, DoorOpen, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE, type CameraPreset } from '@/lib/config/scene-config';
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
