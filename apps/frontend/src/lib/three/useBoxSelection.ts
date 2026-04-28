import { useCallback } from 'react';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import type { Item } from '@/lib/types/item';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

interface SelectedBoxState {
  instanceId: number;
  placement: PlacementWithDimensions;
  item: Item;
}

/**
 * InstancedMesh seçim mantığını izole eder.
 *
 * - `selectInstance(instanceId)`: aynı instance'a tekrar tıklanırsa null'a düşer.
 * - `selected`: aktif placement + item (ikisi de bulunabilirse) — yoksa null.
 *
 * Tek dosyada izolasyon `features/planning/components/CLAUDE.md` standardına bağlı.
 */
export function useBoxSelection(): {
  selected: SelectedBoxState | null;
  selectInstance: (instanceId: number | null) => void;
  clear: () => void;
} {
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  const selectInstance = useCallback(
    (instanceId: number | null) => {
      if (instanceId === null) {
        setSelectedInstanceId(null);
        return;
      }
      setSelectedInstanceId(selectedInstanceId === instanceId ? null : instanceId);
    },
    [selectedInstanceId, setSelectedInstanceId],
  );

  const clear = useCallback(() => setSelectedInstanceId(null), [setSelectedInstanceId]);

  if (selectedInstanceId === null) {
    return { selected: null, selectInstance, clear };
  }

  const placement = placements[selectedInstanceId];
  if (!placement) {
    return { selected: null, selectInstance, clear };
  }

  const entry = selectedItems.find((si) => si.item.id === placement.itemId);
  if (!entry) {
    return { selected: null, selectInstance, clear };
  }

  return {
    selected: { instanceId: selectedInstanceId, placement, item: entry.item },
    selectInstance,
    clear,
  };
}
