\# CLAUDE.md



\## Scope

\- This file is for Cargo Pilot frontend work.

\- Focus on React/Vite/TypeScript UI, routing, forms, state, 3D visualization, reports, and frontend-side integration boundaries.

\- Treat backend behavior as a contract to consume, not something to redesign from frontend tasks.



\## Git First

\- When working with Git, first check these files:

\- `cargo-pilot/docs/conventions/branching.md`

\- `cargo-pilot/docs/conventions/commits.md`

\- Git workflow, branch, PR, and commit rules are defined there; do not duplicate or invent them here.



\## Priority

1\. Task / backlog item

2\. This file

3\. Technical design + team conventions

4\. Existing code patterns



\## Frontend Stack

\- React 18 + Vite + React Router v7.

\- TypeScript strict mode is required.

\- Tailwind CSS v3 + shadcn/ui + Radix UI.

\- react-hook-form + zod for forms and validation.

\- TanStack Query for server state.

\- Zustand for UI/client state only.

\- Three.js + `@react-three/fiber` + `@react-three/drei` for 3D.

\- `react-pdf` and `xlsx`/SheetJS for exports.

\- npm only.



\## Frontend Boundaries

\- Keep feature ownership intact:

\- `features/data-management` for products, vehicles, constraints, imports, ERP data screens.

\- `features/planning` for plan wizard, optimization flows, 3D viewer, and manual placement edits.

\- `features/platform` for auth, users, billing, settings, reports, and sharing.

\- Each feature is split into sub-domain folders, and each sub-domain owns its own `components/`, `hooks/`, and `schemas/`:

\- `data-management/{products,vehicles,imports,plans}`

\- `planning/{panels,scene,export,sharing}`

\- `platform/{auth,billing,dashboard,erp,members,profile,reporting,settings,notifications,sharing}`

\- Add a file to an existing sub-domain rather than to the feature root; open a new sub-domain only for a genuinely new business area.

\- Cross-sub-domain imports use the `@/` alias, not relative `../` paths.

\- Route entry components belong in `pages`, grouped by route area (`pages/auth`, `pages/products`, …).

\- Shared UI belongs in `components/shared`.

\- Infra code belongs in `lib/api`, `lib/store`, `lib/types`, `lib/utils`, `lib/config`.

\- Query hooks and fetchers belong in `lib/api`, not feature folders.

\- Avoid new top-level folders, barrel exports, and broad file moves. The sub-domain layout above was introduced by a one-off approved restructuring (AUDIT-07); do not treat it as licence for further moves.

\- Prefer named exports and function components; avoid default exports and `React.FC`.



\## Frontend Data Rules

\- Do not use `any`; use `unknown` plus narrowing.

\- Zod schemas are the source of truth for forms and API payloads.

\- Derive TS types with `z.infer`; do not maintain duplicate frontend model types by hand.

\- Parse API responses with Zod at the boundary.

\- Use tuple query keys, not plain string keys.

\- Keep API data in TanStack Query; do not mirror it into Zustand.

\- Keep Zustand domain-scoped; do not couple stores through direct slice imports.

\- Access tokens live only in `useAuthStore`; do not write them to `localStorage`.

\- Use the shared auth interceptor/refresh flow.

\- Never hardcode secrets, tokens, or third-party keys in frontend code.



\## Components and Styling

\- Build base UI from shadcn/ui or Radix primitives; do not hand-roll buttons, inputs, dialogs, tables, or similar foundations.

\- Extend classes with `cn()`, not string concatenation.

\- Keep design tokens in global CSS variables.

\- Do not introduce one-off colors, blur, opacity, spacing, or inline styles outside the token system unless the task requires it.

\- Prefer Tailwind utilities over extra CSS files or `@apply`.

\- Preserve the existing Cargo Pilot visual language: operational clarity first, premium industrial feel second.

\- Optimize for non-technical operations users and desktop/tablet workflows.



\## Forms, Routing, and Access

\- Use `react-hook-form` + `zod` for forms; do not manage complex forms with scattered `useState`.

\- Keep `/planning/new` as a single-route SPA wizard; use state, not route changes, for steps.

\- Route guards belong in the established auth/RBAC flow.

\- Role checks and subscription checks are separate; locked features should not silently fail.

\- Billing, ERP settings, and destructive user actions must respect route guards and 2FA assumptions.

\- `/share/:token` is public and read-only; do not render edit actions there.

\- Audit log UI must remain read-only/immutable.



\## 3D Frontend Invariants

\- Loading-plan correctness is more important than visual flourish.

\- Do not weaken frontend handling of capacity, weight balance, center of gravity, stacking, fragility, rotation limits, layer count, or loading direction.

\- Scene contract: centimeters; X = width, Y = height/up, Z = depth.

\- Backend box positions are bottom-left-rear, not mesh center.

\- Keep coordinate mapping centralized in `lib/config/scene-config.ts`.

\- Apply pivot offset correctly; do not reimplement mapping ad hoc across components.

\- Use `InstancedMesh` for large box counts instead of one mesh per item.

\- Dispose manually created Three.js resources on cleanup.

\- Use R3F state/events instead of manual DOM mutation or custom Raycaster plumbing unless clearly necessary.

\- Manual 3D edits must preserve the same validation and violation feedback.



\## Working Style

\- Make small, safe, reviewable changes in the Cargo Pilot frontend.

\- Avoid unnecessary context usage, unnecessary refactors, and architectural violations.

\- Do the requested work only; do not expand scope.

\- Do not touch unrelated files.

\- Keep diffs small.

\- Refactor only when truly necessary.

\- Read only the relevant task and files first; do not scan the whole repo for a small task.

\- Preserve existing patterns before introducing new abstractions.

\- Make the smallest safe diff that solves the problem.

\- Do not refactor unrelated areas, rename files, or move modules unless the task requires it.

\- Be extra conservative in shared state, auth, form, export, and 3D code.

\- Keep changes reviewable and easy to revert.



\## Frontend Quality Gates

\- Before PR, TypeScript, ESLint, tests, and build should pass.

\- Use the narrowest relevant tests first.

\- Vitest is for schemas, utils, and store logic.

\- React Testing Library is for component behavior.

\- Playwright is for critical end-to-end flows.

\- 3D/canvas changes need manual QA and/or snapshot-style verification.

\- UI changes should include screenshots or clear visual notes in the PR.



\## Response Style

\- Lead with the frontend result.

\- State the result first, then give a short technical reason.

\- Keep explanations short and technical.

\- Be explicit about uncertainty or doc conflicts.

\- Prefer concrete next actions over theory.

\- Write simple, readable, professional code.

\- Prefer small, single-responsibility methods.

\- Reduce magic strings/numbers, use nullable consciously, and avoid obvious comments.

\- Do not present uncertain information as certain.



