import { create } from 'zustand';
import { SCENE_DISPLAY_MODES, type SceneDisplayMode } from '@/lib/types';

interface SceneState {
  activeLayer: number;
  selectedBoxId: string | null;
  displayMode: SceneDisplayMode;
  visibleLayers: Set<number>;
}

interface SceneActions {
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setDisplayMode: (mode: SceneDisplayMode) => void;
  toggleDisplayMode: () => void;
  setLayerVisibility: (layer: number, visible: boolean) => void;
  toggleLayerVisibility: (layer: number) => void;
  showOnlyLayer: (layer: number) => void;
  setVisibleLayers: (layers: Iterable<number>) => void;
  reset: () => void;
}

type SceneStore = SceneState & SceneActions;

const initialState = {
  activeLayer: Number.POSITIVE_INFINITY,
  selectedBoxId: null,
  displayMode: SCENE_DISPLAY_MODES.Solid,
  visibleLayers: new Set<number>(),
} satisfies SceneState;

export const useSceneStore = create<SceneStore>((set) => ({
  ...initialState,
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedBoxId: (id) => set({ selectedBoxId: id }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  toggleDisplayMode: () =>
    set((state) => ({
      displayMode:
        state.displayMode === SCENE_DISPLAY_MODES.Wireframe
          ? SCENE_DISPLAY_MODES.Solid
          : SCENE_DISPLAY_MODES.Wireframe,
    })),
  setLayerVisibility: (layer, visible) =>
    set((state) => {
      const nextVisibleLayers = new Set(state.visibleLayers);
      if (visible) {
        nextVisibleLayers.add(layer);
      } else {
        nextVisibleLayers.delete(layer);
      }
      return { visibleLayers: nextVisibleLayers };
    }),
  toggleLayerVisibility: (layer) =>
    set((state) => {
      const nextVisibleLayers = new Set(state.visibleLayers);
      if (nextVisibleLayers.has(layer)) {
        nextVisibleLayers.delete(layer);
      } else {
        nextVisibleLayers.add(layer);
      }
      return { visibleLayers: nextVisibleLayers };
    }),
  showOnlyLayer: (layer) => set({ visibleLayers: new Set([layer]), activeLayer: layer }),
  setVisibleLayers: (layers) => set({ visibleLayers: new Set(layers) }),
  reset: () => set(initialState),
}));

