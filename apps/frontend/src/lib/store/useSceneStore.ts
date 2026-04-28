import { create } from 'zustand';
import type { CameraPreset } from '@/lib/config/scene-config';

type DisplayMode = 'wireframe' | 'solid';

interface SceneStore {
  activeLayer: number;
  selectedBoxId: string | null;
  selectedItemId: string | null;
  selectedInstanceId: number | null;
  hiddenItemIds: string[];
  displayMode: DisplayMode;
  cameraPreset: CameraPreset | null;
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setSelectedItemId: (id: string | null) => void;
  setSelectedInstanceId: (id: number | null) => void;
  toggleHiddenItem: (id: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  setCameraPreset: (preset: CameraPreset | null) => void;
  reset: () => void;
}

const initialState = {
  activeLayer: Number.POSITIVE_INFINITY,
  selectedBoxId: null,
  selectedItemId: null,
  selectedInstanceId: null as number | null,
  hiddenItemIds: [] as string[],
  displayMode: 'solid' as DisplayMode,
  cameraPreset: null as CameraPreset | null,
};

export const useSceneStore = create<SceneStore>((set) => ({
  ...initialState,
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedBoxId: (id) => set({ selectedBoxId: id }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),
  toggleHiddenItem: (id) =>
    set((s) => ({
      hiddenItemIds: s.hiddenItemIds.includes(id)
        ? s.hiddenItemIds.filter((x) => x !== id)
        : [...s.hiddenItemIds, id],
    })),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  toggleDisplayMode: () =>
    set((s) => ({ displayMode: s.displayMode === 'solid' ? 'wireframe' : 'solid' })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  reset: () => set(initialState),
}));
