import { create } from 'zustand';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import type { OptimizationCriteria, PlacementWithDimensions } from '@/lib/types/loadingPlan';

interface PlanStore {
  selectedVehicle: Vehicle | null;
  selectedItems: Array<{ item: Item; quantity: number }>;
  criteria: OptimizationCriteria;
  placements: PlacementWithDimensions[];
  setVehicle: (vehicle: Vehicle) => void;
  addItem: (item: Item, qty: number) => void;
  setCriteria: (c: OptimizationCriteria) => void;
  setPlacements: (placements: PlacementWithDimensions[]) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedVehicle: null,
  selectedItems: [],
  criteria: 0,
  placements: [],
  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  addItem: (item, qty) =>
    set((s) => ({
      selectedItems: [...s.selectedItems, { item, quantity: qty }],
    })),
  setCriteria: (criteria) => set({ criteria }),
  setPlacements: (placements) => set({ placements }),
  reset: () => set({ selectedVehicle: null, selectedItems: [], criteria: 0, placements: [] }),
}));
