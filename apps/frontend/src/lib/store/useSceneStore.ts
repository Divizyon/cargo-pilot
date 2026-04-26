import { create } from 'zustand';
import type { CameraPreset } from '@/lib/config/scene-config';

type DisplayMode = 'wireframe' | 'solid';

interface SceneStore {
  activeLayer: number;
  selectedBoxId: string | null;
  displayMode: DisplayMode;
  cameraPreset: CameraPreset | null;
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  setCameraPreset: (preset: CameraPreset | null) => void;
  reset: () => void;
}

const initialState = {
  activeLayer: Number.POSITIVE_INFINITY,
  selectedBoxId: null,
  displayMode: 'solid' as DisplayMode,
  cameraPreset: null as CameraPreset | null,
};

export const useSceneStore = create<SceneStore>((set) => ({
  ...initialState,
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedBoxId: (id) => set({ selectedBoxId: id }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  toggleDisplayMode: () =>
    set((s) => ({ displayMode: s.displayMode === 'solid' ? 'wireframe' : 'solid' })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  reset: () => set(initialState),
}));
