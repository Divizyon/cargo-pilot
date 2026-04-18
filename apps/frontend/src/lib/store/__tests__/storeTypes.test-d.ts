import type {
  FormMode,
  OptimizationCriteria,
  SceneDisplayMode,
  UITheme,
  UserRole,
} from '@/lib/types';

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;

type ValidTheme = Assert<IsAssignable<'light', UITheme>>;
type ValidRole = Assert<IsAssignable<'admin', UserRole>>;
type ValidSceneMode = Assert<IsAssignable<'xray', SceneDisplayMode>>;
type ValidFormMode = Assert<IsAssignable<'edit', FormMode>>;
type ValidCriteria = Assert<IsAssignable<1, OptimizationCriteria>>;

// @ts-expect-error Invalid UI theme should be rejected.
type InvalidTheme = Assert<IsAssignable<'neon', UITheme>>;

// @ts-expect-error Invalid user role should be rejected.
type InvalidRole = Assert<IsAssignable<'superadmin', UserRole>>;

// @ts-expect-error Invalid scene mode should be rejected.
type InvalidSceneMode = Assert<IsAssignable<'ghost', SceneDisplayMode>>;

// @ts-expect-error Invalid form mode should be rejected.
type InvalidFormMode = Assert<IsAssignable<'view', FormMode>>;

// @ts-expect-error Invalid optimization criteria value should be rejected.
type InvalidCriteria = Assert<IsAssignable<999, OptimizationCriteria>>;

export type StoreTypeContractTests =
  | ValidTheme
  | ValidRole
  | ValidSceneMode
  | ValidFormMode
  | ValidCriteria;
