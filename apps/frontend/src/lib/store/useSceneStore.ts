import { create } from 'zustand';

type DisplayMode = 'wireframe' | 'solid';

interface SceneStore {
  activeLayer: number;
  selectedBoxId: string | null;
  selectedItemId: string | null;
  hiddenItemIds: string[];
  displayMode: DisplayMode;
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setSelectedItemId: (id: string | null) => void;
  toggleHiddenItem: (id: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  reset: () => void;
}

const initialState = {
  activeLayer: Number.POSITIVE_INFINITY,
  selectedBoxId: null,
  selectedItemId: null,
  hiddenItemIds: [] as string[],
  displayMode: 'solid' as DisplayMode,
};

export const useSceneStore = create<SceneStore>((set) => ({
  ...initialState,
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedBoxId: (id) => set({ selectedBoxId: id }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  toggleHiddenItem: (id) =>
    set((s) => ({
      hiddenItemIds: s.hiddenItemIds.includes(id)
        ? s.hiddenItemIds.filter((x) => x !== id)
        : [...s.hiddenItemIds, id],
    })),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  toggleDisplayMode: () =>
    set((s) => ({ displayMode: s.displayMode === 'solid' ? 'wireframe' : 'solid' })),
  reset: () => set(initialState),
}));
