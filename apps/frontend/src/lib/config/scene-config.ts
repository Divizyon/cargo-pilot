export const SCENE = {
  CAMERA_POSITION: [0, 300, 600] as const,
  CAMERA_FOV: 50,
  CAMERA_NEAR: 1,
  CAMERA_FAR: 20000,

  ORBIT_MIN_DISTANCE: 50,
  ORBIT_MAX_DISTANCE: 4000,
  ORBIT_MAX_POLAR_ANGLE: Math.PI / 2,
  ORBIT_AUTO_ROTATE_SPEED: 0.6,
  ORBIT_DAMPING_FACTOR: 0.05,

  LOAD_INTERVAL_MS: 380,
  DROP_EASING: 0.12,
  DROP_GLOW: 0.25,
  IDLE_GLOW: 0.06,

  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_INTENSITY: 1,
  DIRECTIONAL_POSITION: [800, 1000, 500] as const,
  RIM_INTENSITY: 0.3,
  RIM_POSITION: [-600, 400, -500] as const,
  RIM_COLOR: 0x4488ff,

  BACKGROUND_COLOR: '#f3f4f6',
  CONTACT_SHADOW_OPACITY: 0.4,
  CONTACT_SHADOW_BLUR: 2.5,
  CONTACT_SHADOW_SCALE_FACTOR: 2,

  CONTAINER_WALL_OPACITY: 0.3,
  CONTAINER_WALL_OPACITY_BACK: 0.2,

  COLORS: {
    VIOLATION: 0xdc2626,
    VIOLATION_STR: '#dc2626',
    SELECTED: 0xfbbf24,
    SELECTED_STR: '#fbbf24',
    COG_NORMAL: 0xfbbf24,
    COG_WARNING: 0xdc2626,
    NORMAL: 0x2563eb,
    NORMAL_STR: '#2563eb',
    CONTAINER_EDGE: '#334155',
    CONTAINER_EDGE_OUTER: '#ffffff',
    CONTAINER_DOOR: '#f59e0b',
    CONTAINER_INSIDE: '#d4c9a8',
    GRID: '#94a3b8',
    GROUPS: {
      A: 0xef4444,
      B: 0x3b82f6,
      C: 0xf59e0b,
      D: 0x22c55e,
    },
    SKU_PALETTE: [
      '#6366f1',
      '#0ea5e9',
      '#f59e0b',
      '#f43f5e',
      '#8b5cf6',
      '#fb923c',
      '#22c55e',
      '#3b82f6',
      '#ef4444',
      '#14b8a6',
      '#ec4899',
      '#84cc16',
    ] as string[],
  },

  DOOR_REAR_OPEN_ANGLE: Math.PI * 0.72,
  DOOR_SIDE_OPEN_ANGLE: Math.PI * 0.5,
  DOOR_EASING: 0.055,
  DOOR_THICKNESS_CM: 5,
  DOOR_SIDE_PANEL_W_CM: 15,

  INSTANCED_THRESHOLD: 50,
  LANDING_START_OFFSET: 150,
  GRID_STEP_CM: 50,
  LEVEL_FILTER_STEP_CM: 10,
  DRAG_SNAP_THRESHOLD_CM: 15,

  SHADOW_MAP_SIZE: 2048,
  SHADOW_CAMERA_SIZE: 1500,
  SHADOW_CAMERA_NEAR: 1,
  SHADOW_CAMERA_FAR: 5000,

  CAMERA_TRANSITION_S: 0.8,
  CAMERA_DISTANCE_FACTOR: 1.5,

  CAMERA_PRESETS: {
    TOP: { dir: [0, 1, 0.001] as const, label: 'Üstten' },
    FRONT: { dir: [0, 0.25, 1] as const, label: 'Önden' },
    BACK: { dir: [0, 0.25, -1] as const, label: 'Arkadan' },
    SIDE_RIGHT: { dir: [1, 0.25, 0] as const, label: 'Sağ Yan' },
    SIDE_LEFT: { dir: [-1, 0.25, 0] as const, label: 'Sol Yan' },
    ISO: { dir: [0.55, 0.5, 0.9] as const, label: 'İzometrik' },
  },
} as const;

export type CameraPreset = keyof typeof SCENE.CAMERA_PRESETS;
