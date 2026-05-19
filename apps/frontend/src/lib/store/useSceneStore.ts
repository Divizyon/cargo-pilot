import { create } from 'zustand';
import type { CameraPreset } from '@/lib/config/scene-config';

type DisplayMode = 'wireframe' | 'solid';
type AnimationMode = 'idle' | 'playing' | 'stepped';

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
  stressTestMode: boolean;
  focusedGroupItemIds: string[] | null;
  animationMode: AnimationMode;
  animationStep: number;
  /** Optimizasyon tamamlandı, kullanıcı "Yükle" butonuna basmayı bekliyor */
  animationReady: boolean;
  sceneReady: boolean;
  requestSnapshot: boolean;
  snapshotDataUrl: string | null;
  setAnimationMode: (mode: AnimationMode) => void;
  setAnimationStep: (step: number) => void;
  setAnimationReady: (ready: boolean) => void;
  /** Animasyonu sıfırdan başlatır — tek atomik update */
  startAnimation: () => void;
  resetAnimation: () => void;
  setActiveLayer: (layer: number) => void;
  setSelectedBoxId: (id: string | null) => void;
  setSelectedItemId: (id: string | null) => void;
  setSelectedInstanceId: (id: number | null) => void;
  toggleHiddenItem: (id: string) => void;
  setHiddenItemIds: (ids: string[]) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  setCameraPreset: (preset: CameraPreset | null) => void;
  setIsDragging: (v: boolean) => void;
  setDragLivePosition: (pos: { x: number; y: number; z: number } | null) => void;
  toggleShowCog: () => void;
  toggleXRayMode: () => void;
  toggleStressTestMode: () => void;
  setFocusedGroupItemIds: (ids: string[] | null) => void;
  setSceneReady: (ready: boolean) => void;
  triggerSnapshot: () => void;
  setSnapshotDataUrl: (url: string | null) => void;
  clearSnapshot: () => void;
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
  showCog: false,
  xRayMode: false,
  stressTestMode: false,
  focusedGroupItemIds: null as string[] | null,
  animationMode: 'idle' as AnimationMode,
  animationStep: 0,
  animationReady: false,
  sceneReady: false,
  requestSnapshot: false,
  snapshotDataUrl: null as string | null,
};

export const useSceneStore = create<SceneStore>((set) => ({
  ...initialState,
  setAnimationMode: (mode) => set({ animationMode: mode }),
  setAnimationStep: (step) => set({ animationStep: step }),
  setAnimationReady: (ready) => set({ animationReady: ready }),
  startAnimation: () => set({ animationMode: 'playing', animationStep: 0, animationReady: false }),
  // stepped+0: barı kapatmaz, sadece başa sarar — idle yalnızca tam sıfırlama için
  resetAnimation: () => set({ animationMode: 'stepped', animationStep: 0, animationReady: false }),
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
  setHiddenItemIds: (ids) => set({ hiddenItemIds: ids }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  toggleDisplayMode: () =>
    set((s) => ({ displayMode: s.displayMode === 'solid' ? 'wireframe' : 'solid' })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setIsDragging: (v) => set({ isDragging: v }),
  setDragLivePosition: (pos) => set({ dragLivePosition: pos }),
  toggleShowCog: () => set((s) => ({ showCog: !s.showCog })),
  toggleXRayMode: () => set((s) => ({ xRayMode: !s.xRayMode })),
  toggleStressTestMode: () => set((s) => ({ stressTestMode: !s.stressTestMode })),
  setFocusedGroupItemIds: (ids) => set({ focusedGroupItemIds: ids }),
  setSceneReady: (ready) => set({ sceneReady: ready }),
  triggerSnapshot: () => set({ requestSnapshot: true }),
  setSnapshotDataUrl: (url) => set({ requestSnapshot: false, snapshotDataUrl: url }),
  clearSnapshot: () => set({ requestSnapshot: false, snapshotDataUrl: null }),
  reset: () => set(initialState),
}));
