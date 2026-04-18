export const USER_ROLES = {
  Admin: 'admin',
  Planner: 'planner',
  Operator: 'operator',
  Viewer: 'viewer',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const NOTIFICATION_TYPES = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type UITheme = 'light' | 'dark' | 'system';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  createdAt: number;
}

export interface Vehicle {
  id: string;
  name: string;
  width: number;
  height: number;
  length: number;
  payload: number;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  isStackable: boolean;
  maxStackCount: number;
}

export interface Placement {
  itemId: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotation: number;
  layer: number;
  isViolation: boolean;
}

export const OPTIMIZATION_CRITERIA = {
  MaximizeSpace: 0,
  MaximizeWeight: 1,
  BalanceLoad: 2,
} as const;

export type OptimizationCriteria =
  (typeof OPTIMIZATION_CRITERIA)[keyof typeof OPTIMIZATION_CRITERIA];

export interface PlanCartEntry {
  itemId: string;
  quantity: number;
}

export const SCENE_DISPLAY_MODES = {
  Wireframe: 'wireframe',
  Solid: 'solid',
  Xray: 'xray',
} as const;

export type SceneDisplayMode =
  (typeof SCENE_DISPLAY_MODES)[keyof typeof SCENE_DISPLAY_MODES];

export const FORM_MODES = {
  Create: 'create',
  Edit: 'edit',
} as const;

export type FormMode = (typeof FORM_MODES)[keyof typeof FORM_MODES];

export interface AuthSession {
  token: string;
  role: UserRole;
}
