export const ROUTES = {
  DASHBOARD: '/dashboard',
  PLANNING: '/planning',
  PLANNING_NEW: '/planning/new',
  PRODUCTS: '/products',
  PRODUCTS_NEW: '/products/new',
  VEHICLES: '/vehicles',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

export function planningDetailRoute(id: string): string {
  return `/planning/${id}`;
}
