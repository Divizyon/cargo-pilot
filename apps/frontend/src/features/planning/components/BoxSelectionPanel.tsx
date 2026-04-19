import { X } from 'lucide-react';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { Button } from '@/components/ui/button';

export function BoxSelectionPanel() {
  const selectedBoxId = useSceneStore((s) => s.selectedBoxId);
  const setSelectedBoxId = useSceneStore((s) => s.setSelectedBoxId);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  if (!selectedBoxId) return null;

  const placement = placements.find((p) => p.itemId === selectedBoxId);
  const item = selectedItems.find((s) => s.item.id === selectedBoxId)?.item;

  if (!placement) return null;

  return (
    <div className="absolute right-3 top-3 z-10 w-64 rounded-lg border border-border bg-background/90 p-4 shadow-lg backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Kutu Detayları</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setSelectedBoxId(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <dl className="space-y-1.5 text-sm">
        {item && (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Ürün Adı</dt>
              <dd className="truncate font-medium text-foreground">{item.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-medium text-foreground">{item.sku}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Boyutlar (G×Y×D)</dt>
          <dd className="font-medium text-foreground">
            {placement.width}×{placement.height}×{placement.depth} cm
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Pozisyon (X,Y,Z)</dt>
          <dd className="font-medium text-foreground">
            {placement.positionX}, {placement.positionY}, {placement.positionZ}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Katman</dt>
          <dd className="font-medium text-foreground">{placement.layer}</dd>
        </div>
        {placement.isViolation && (
          <div className="mt-2 rounded bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
            Kural İhlali
          </div>
        )}
      </dl>
    </div>
  );
}
