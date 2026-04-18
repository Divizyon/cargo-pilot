# Zustand Slice Architecture

This folder contains domain-focused UI state slices for Cargo Pilot squads.

## Core Rules

- Store only client/UI state in Zustand.
- Server state is managed by TanStack Query cache.
- Do not import one store inside another store file.
- Do not create a store barrel export file.
- Do not use TypeScript enum; use const object with `as const`.
- Validate each slice initial state with `satisfies`.

## Slice Ownership

- `useAuthStore.ts` (Squad 3): session token and role state.
- `useUIStore.ts` (Shared): theme, sidebar, global notifications.
- `usePlanStore.ts` (Squad 2): selected vehicle id, planning cart, optimization criteria, placement results.
- `useSceneStore.ts` (Squad 2): active layer, selected box, display mode, layer visibility set.
- `useFormStore.ts` (Squad 1): wizard step and form meta state.

## Explicitly Forbidden

- Writing API lists and detail payloads (vehicles, items, user profile) into Zustand.
- Imperative Three.js mutations like `group.visible = false` in components.
- Copying react-hook-form field values into `useFormStore`.
- Cross-slice imports inside store files.
- Adding `src/lib/store/index.ts` barrel.

## Cross-store Access

Use `getState()` from non-React locations (interceptors, utilities, service callbacks).
Real patterns are documented in `crossStorePatterns.ts`.
