import { create } from 'zustand';

type DisplayMode = 'wireframe' | 'solid';

interface SceneStore {
  activeLayer: number;
  selectedBoxId: string | null;
  displayMode: DisplayMode;
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  reset: () => void;
}

const initialState = {
  activeLayer: Number.POSITIVE_INFINITY,
  selectedBoxId: null,
  displayMode: 'solid' as DisplayMode,
};

export const useSceneStore = create<SceneStore>((set) => ({
  ...initialState,
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedBoxId: (id) => set({ selectedBoxId: id }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  toggleDisplayMode: () =>
    set((s) => ({ displayMode: s.displayMode === 'solid' ? 'wireframe' : 'solid' })),
  reset: () => set(initialState),
}));
