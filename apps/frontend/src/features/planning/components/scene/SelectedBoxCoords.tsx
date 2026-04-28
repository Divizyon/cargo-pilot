import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';

export function SelectedBoxCoords() {
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const isDragging = useSceneStore((s) => s.isDragging);
  const dragLivePosition = useSceneStore((s) => s.dragLivePosition);
  const placements = usePlanStore((s) => s.placements);

  const selected = placements.find((p) => p.itemId === selectedItemId);
  if (!selected) return null;

  const x = isDragging && dragLivePosition ? dragLivePosition.x : selected.positionX;
  const y = isDragging && dragLivePosition ? dragLivePosition.y : selected.positionY;
  const z = isDragging && dragLivePosition ? dragLivePosition.z : selected.positionZ;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="flex items-center gap-3 rounded-lg bg-black/60 px-4 py-2 text-xs font-mono text-white backdrop-blur-sm">
        <span>
          <span className="text-zinc-400">X </span>
          {Math.round(x)} cm
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          <span className="text-zinc-400">Y </span>
          {Math.round(y)} cm
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          <span className="text-zinc-400">Z </span>
          {Math.round(z)} cm
        </span>
      </div>
    </div>
  );
}
