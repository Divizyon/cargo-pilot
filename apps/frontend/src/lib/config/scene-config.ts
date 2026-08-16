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

  COLORS: {
    VIOLATION: 0xe11d48, // Crimson Edge
    VIOLATION_STR: '#E11D48',
    SELECTED: 0xa7f3d0, // Mint Frost
    SELECTED_STR: '#A7F3D0',
    COG_NORMAL: 0xfbbf24,
    COG_WARNING: 0xe11d48,
    NORMAL: 0x2dd4bf, // Industrial Teal
    NORMAL_STR: '#2DD4BF',
    CONTAINER_EDGE: '#334155',
    CONTAINER_DOOR: '#f59e0b',
    CONTAINER_INSIDE: '#d4c9a8',
    GRID: '#94a3b8',
    GROUPS: {
      A: 0xef4444,
      B: 0x3b82f6,
      C: 0xf59e0b,
      D: 0x22c55e,
    },
    // Yük grubu bilinmediğinde fallback olarak kullanılan palet
    SKU_PALETTE: [
      '#34D399', // Cargo Emerald  — Gıda
      '#FBBF24', // Modern Amber   — Kimya
      '#FB923C', // Safety Orange  — Tehlikeli Madde
      '#A855F7', // Cyber Violet   — Elektronik
      '#D97706', // Desert Sand    — Tekstil
      '#94A3B8', // Slate 400      — Genel
      '#2DD4BF', // Industrial Teal
      '#818CF8', // Logistics Indigo
      '#FB7185', // Steel Rose
      '#0EA5E9', // Deep Ocean
      '#84CC16', // Electric Lime
      '#4338CA', // Midnight Cobalt
      '#334155', // Volcanic Grey
    ] as string[],
  },

  /**
   * Referans kapı kanadı açılma açısı. TIR'ın arkadaki küçük kapısı gerçekten 230°'ye
   * kadar açılıp yan duvara katlanır, bu değer fiziksel.
   */
  DOOR_REAR_OPEN_ANGLE: Math.PI * (230 / 180),

  /**
   * Büyük ve üst kapı açılma açısı.
   *
   * 250° idi: büyük kapı o açıda aracın gövdesinin içinden geçiyor, üst kapı ise
   * tavanın metrelerce altına iniyordu (denetim S-52/S-55). İkisi de menteşeden
   * dışa açılan tek kanatlar; 110° hem fiziksel hem yükleme açıklığını
   * gösterecek kadar geniş.
   */
  DOOR_SIDE_OPEN_ANGLE: Math.PI * (110 / 180),
  DOOR_EASING: 0.055,
  DOOR_THICKNESS_CM: 5,
  DOOR_SIDE_PANEL_W_CM: 15,

  INSTANCED_THRESHOLD: 50,

  // Yükleme animasyonu: HTML prototipindeki adaptive schedule mantığı
  // totalDuration = clamp(ANIM_MIN_MS..ANIM_MAX_MS, ANIM_BASE_MS + count * ANIM_PER_BOX_MS)
  // perBoxStagger = totalDuration / count
  // boxFlight = clamp(ANIM_FLIGHT_MIN_MS..ANIM_FLIGHT_MAX_MS, perBoxStagger * ANIM_FLIGHT_RATIO)
  ANIM_BASE_MS: 2000,
  ANIM_PER_BOX_MS: 70,
  ANIM_MIN_MS: 2500,
  ANIM_MAX_MS: 4500,
  ANIM_FLIGHT_MIN_MS: 500,
  ANIM_FLIGHT_MAX_MS: 900,
  ANIM_FLIGHT_RATIO: 1.8,
  // Kapı dışı başlangıç ofseti (cm) — Z ekseninde aracın önüne göre
  ANIM_DOOR_OFFSET_CM: 200,
  LANDING_START_OFFSET: 150,
  GRID_STEP_CM: 50,
  LEVEL_FILTER_STEP_CM: 10,
  DRAG_SNAP_THRESHOLD_CM: 15,
  STAGING_GAP_CM: 150,
  STAGING_INTER_GAP_CM: 10,
  STAGING_WIDTH_CM: 600,
  STAGING_DEPTH_CM: 400,

  SHADOW_MAP_SIZE: 2048,
  SHADOW_CAMERA_SIZE: 1500,
  SHADOW_CAMERA_NEAR: 1,
  SHADOW_CAMERA_FAR: 5000,

  CAMERA_TRANSITION_S: 0.8,
  CAMERA_DISTANCE_FACTOR: 1.5,

  CAMERA_PRESETS: {
    TOP: { dir: [0, 1, 0.001] as const, label: 'Üstten' },
    FRONT: { dir: [0, 0.25, -1] as const, label: 'Önden' },
    BACK: { dir: [0, 0.25, 1] as const, label: 'Arkadan' },
    SIDE_RIGHT: { dir: [1, 0.25, 0] as const, label: 'Sağ Yan' },
    SIDE_LEFT: { dir: [-1, 0.25, 0] as const, label: 'Sol Yan' },
    ISO: { dir: [0.55, 0.5, 0.9] as const, label: 'İzometrik' },
  },
} as const;

export type CameraPreset = keyof typeof SCENE.CAMERA_PRESETS;
