import { create } from 'zustand';
import {
  OPTIMIZATION_CRITERIA,
  type OptimizationCriteria,
  type Placement,
  type PlanCartEntry,
} from '@/lib/types';

interface PlanState {
  selectedVehicleId: string | null;
  selectedItems: PlanCartEntry[];
  criteria: OptimizationCriteria;
  placements: Placement[];
}

interface PlanActions {
  setSelectedVehicleId: (vehicleId: string | null) => void;
  addItem: (itemId: string, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearItems: () => void;
  setCriteria: (criteria: OptimizationCriteria) => void;
  setPlacements: (placements: Placement[]) => void;
  clearPlacements: () => void;
  reset: () => void;
}

type PlanStore = PlanState & PlanActions;

const initialState = {
  selectedVehicleId: null,
  selectedItems: [],
  criteria: OPTIMIZATION_CRITERIA.MaximizeSpace,
  placements: [],
} satisfies PlanState;

const normalizeQuantity = (quantity: number): number => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }
  return Math.floor(quantity);
};

export const usePlanStore = create<PlanStore>((set) => ({
  ...initialState,
  setSelectedVehicleId: (vehicleId) => set({ selectedVehicleId: vehicleId }),
  addItem: (itemId, quantity = 1) =>
    set((state) => {
      const normalizedQuantity = normalizeQuantity(quantity);
      const existingItem = state.selectedItems.find((entry) => entry.itemId === itemId);

      if (existingItem) {
        return {
          selectedItems: state.selectedItems.map((entry) =>
            entry.itemId === itemId
              ? { ...entry, quantity: entry.quantity + normalizedQuantity }
              : entry,
          ),
        };
      }

      return {
        selectedItems: [...state.selectedItems, { itemId, quantity: normalizedQuantity }],
      };
    }),
  removeItem: (itemId) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter((entry) => entry.itemId !== itemId),
    })),
  updateItemQuantity: (itemId, quantity) =>
    set((state) => {
      const normalizedQuantity = normalizeQuantity(quantity);
      return {
        selectedItems: state.selectedItems.map((entry) =>
          entry.itemId === itemId ? { ...entry, quantity: normalizedQuantity } : entry,
        ),
      };
    }),
  clearItems: () => set({ selectedItems: [] }),
  setCriteria: (criteria) => set({ criteria }),
  setPlacements: (placements) => set({ placements }),
  clearPlacements: () => set({ placements: [] }),
  reset: () => set(initialState),
}));

