export const SCENE = {
  CAMERA_POSITION: [0, 300, 600] as const,
  CAMERA_FOV: 50,
  CAMERA_NEAR: 1,
  CAMERA_FAR: 20000,

  ORBIT_MIN_DISTANCE: 50,
  ORBIT_MAX_DISTANCE: 4000,
  ORBIT_AUTO_ROTATE_SPEED: 0.6,
  ORBIT_DAMPING_FACTOR: 0.05,

  LOAD_INTERVAL_MS: 380,
  DROP_EASING: 0.12,
  DROP_GLOW: 0.25,
  IDLE_GLOW: 0.06,

  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_INTENSITY: 1,
  DIRECTIONAL_POSITION: [10, 10, 5] as const,
  RIM_INTENSITY: 0.3,
  RIM_POSITION: [-8, 4, -6] as const,
  RIM_COLOR: 0x4488ff,

  COLORS: {
    VIOLATION: 0xdc2626,
    VIOLATION_STR: '#dc2626',
    SELECTED: 0xfbbf24,
    SELECTED_STR: '#fbbf24',
    NORMAL: 0x2563eb,
    NORMAL_STR: '#2563eb',
    CONTAINER_EDGE: '#334155',
    CONTAINER_DOOR: '#f59e0b',
    GRID: '#94a3b8',
    GROUPS: {
      A: 0xef4444,
      B: 0x3b82f6,
      C: 0xf59e0b,
      D: 0x22c55e,
    },
    SKU_PALETTE: [
      '#6366f1', '#0ea5e9', '#f59e0b', '#f43f5e',
      '#8b5cf6', '#fb923c', '#22c55e', '#3b82f6',
      '#ef4444', '#14b8a6', '#ec4899', '#84cc16',
    ] as string[],
  },

  INSTANCED_THRESHOLD: 50,
  GRID_STEP_CM: 50,

  CAMERA_TRANSITION_S: 0.8,
  CAMERA_DISTANCE_FACTOR: 1.5,

  CAMERA_PRESETS: {
    TOP:   { dir: [0, 1, 0.001] as const, label: 'Üstten' },
    FRONT: { dir: [0, 0.25, 1]  as const, label: 'Önden'  },
    SIDE:  { dir: [1, 0.25, 0]  as const, label: 'Yandan' },
    ISO:   { dir: [0.55, 0.5, 0.9] as const, label: 'İzometrik' },
  },
} as const;

export type CameraPreset = keyof typeof SCENE.CAMERA_PRESETS;
