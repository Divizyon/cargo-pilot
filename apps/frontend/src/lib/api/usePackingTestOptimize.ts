import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';
import { axiosInstance } from './axiosInstance';

// Test endpoint'ten gelen renk haritası (SKU'ya göre)
const TEST_SKU_COLORS: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': '#ef4444', // Ağır Makine
  '00000000-0000-0000-0000-000000000002': '#3b82f6', // Hafif Strafor
  '00000000-0000-0000-0000-000000000003': '#f59e0b', // Standar Kutu
};

// Backend item boyutları (JSON'daki değerler, Z-flip için)
const TEST_ITEM_DIMS: Record<string, { l: number; w: number; h: number; weight: number }> = {
  '00000000-0000-0000-0000-000000000001': { l: 60, w: 60, h: 60, weight: 1500 },
  '00000000-0000-0000-0000-000000000002': { l: 200, w: 100, h: 100, weight: 30 },
  '00000000-0000-0000-0000-000000000003': { l: 100, w: 100, h: 100, weight: 100 },
};

const TEST_CONTAINER_LENGTH = 590;

const placementDtoSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotation: z.object({ l: z.number(), w: z.number(), h: z.number() }),
});

const packingResultSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    placements: z.array(placementDtoSchema),
    fillRatePercent: z.number(),
    totalWeight: z.number(),
    placedCount: z.number(),
    unplacedCount: z.number(),
  }),
});

function originalItemId(compositeId: string): string {
  const sep = compositeId.lastIndexOf('__');
  return sep === -1 ? compositeId : compositeId.slice(0, sep);
}

function mapTestPlacements(
  data: z.infer<typeof packingResultSchema>['data'],
): PlacementWithDimensions[] {
  return data.placements.map((p) => {
    const baseId = originalItemId(p.itemId);
    const color = TEST_SKU_COLORS[baseId] ?? SCENE.COLORS.NORMAL_STR;
    const dims = TEST_ITEM_DIMS[baseId];

    const { l: rotL, w: rotW, h: rotH } = p.rotation;

    const positionX = p.y;
    const positionY = p.z;
    const positionZ = TEST_CONTAINER_LENGTH - p.x - rotL;

    return {
      itemId: baseId,
      positionX,
      positionY,
      positionZ,
      orientationIndex: 0,
      layer: Math.floor(positionY / rotH) + 1,
      isViolation: false,
      width: rotW,
      height: rotH,
      depth: rotL,
      weight: dims?.weight ?? 0,
      color,
    };
  });
}

export function usePackingTestOptimize() {
  return useMutation({
    mutationFn: async (): Promise<PlacementWithDimensions[]> => {
      const { data } = await axiosInstance.get<unknown>('/api/packing/optimize/test');
      const parsed = packingResultSchema.parse(data);
      return mapTestPlacements(parsed.data);
    },
  });
}
