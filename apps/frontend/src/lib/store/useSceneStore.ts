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
  isDragging: boolean;
  dragLivePosition: { x: number; y: number; z: number } | null;
  showCog: boolean;
  xRayMode: boolean;
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setSelectedItemId: (id: string | null) => void;
  setSelectedInstanceId: (id: number | null) => void;
  toggleHiddenItem: (id: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  setCameraPreset: (preset: CameraPreset | null) => void;
  setIsDragging: (v: boolean) => void;
  setDragLivePosition: (pos: { x: number; y: number; z: number } | null) => void;
  toggleShowCog: () => void;
  toggleXRayMode: () => void;
  reset: () => void;
}

const initialState = {
  activeLayer: 0,
  selectedBoxId: null,
  selectedItemId: null,
  selectedInstanceId: null as number | null,
  hiddenItemIds: [] as string[],
  displayMode: 'solid' as DisplayMode,
  cameraPreset: null as CameraPreset | null,
  isDragging: false,
  dragLivePosition: null as { x: number; y: number; z: number } | null,
  showCog: true,
  xRayMode: false,
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
  setIsDragging: (v) => set({ isDragging: v }),
  setDragLivePosition: (pos) => set({ dragLivePosition: pos }),
  toggleShowCog: () => set((s) => ({ showCog: !s.showCog })),
  toggleXRayMode: () => set((s) => ({ xRayMode: !s.xRayMode })),
  reset: () => set(initialState),
}));
