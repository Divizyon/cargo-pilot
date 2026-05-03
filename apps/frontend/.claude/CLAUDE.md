---
description:
alwaysApply: true
---

# Cargo Pilot — Genel Standartlar

## Kural Dosyası Yapısı

Bu proje birden fazla `CLAUDE.md` kullanır. Kural dosyaları feature klasörlerine bölünmüştür:

| Dosya                                | Kapsam                                        |
| ------------------------------------ | --------------------------------------------- |
| `/CLAUDE.md` (bu dosya)              | Genel kurallar — tüm squad'lar                |
| `features/planning/CLAUDE.md`        | 3D sahne, Three.js, animasyon, Squad 2        |
| `features/data-management/CLAUDE.md` | Form şemaları, ürün/araç veri modeli, Squad 1 |

Claude Code bulunduğun klasörden yukarıya tarayarak tüm ilgili dosyaları otomatik yükler.

---

## Stack

React 18 + Vite 5 · TypeScript 5 strict · Tailwind CSS v3 · shadcn/ui + Radix · react-hook-form + zod · Zustand v4 · TanStack Query v5 · React Router v6 · npm (pnpm/yarn yasak)

## Temel Kurallar

- `any` yasak → `unknown` + type guard
- `default export` yasak → named export
- `React.FC` yasak → props tipi doğrudan parametrede
- `index.ts` barrel export yasak
- Sunucu verisi Zustand'a yazılmaz → TanStack Query'de kalır
- shadcn dışı UI bileşeni yazılmaz
- CI geçmeyen PR merge edilmez

## Klasör Yapısı

```
src/
├── pages/
├── features/
│   ├── data-management/  → Squad 1
│   ├── planning/         → Squad 2
│   └── platform/         → Squad 3
├── components/shared/
└── lib/
    ├── api/      → TanStack Query hook'ları (feature klasörüne taşınmaz)
    ├── store/    → Zustand slice'ları
    ├── types/    → Item, Vehicle, Placement, LoadingPlan
    ├── utils/
    └── config/
```

İsimlendirme: bileşen `PascalCase.tsx` · hook `useName.ts` · store `useNameStore.ts` · schema `nameSchema.ts` · klasör `kebab-case/`

## TypeScript

- `strict:true` zorunlu, form field'larında `as` casting yasak
- Manuel interface yazılmaz → Zod'dan `z.infer<typeof Schema>`

```ts
export const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  weight: z.number().positive(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int().min(1),
});
export type Item = z.infer<typeof itemSchema>;

// Enum — TypeScript enum yasak
export const FragilityType = { NonFragile: 0, Fragile: 1, Liquid: 2 } as const;
export type FragilityType = (typeof FragilityType)[keyof typeof FragilityType];
```

## UI Kit & Token

Font: **Plus Jakarta Sans**. Import: `fonts.css → tailwind.css → theme.css`

`--background:#fff` · `--primary:#030213` · `--muted:#ececf0` · `--destructive:#d4183d` · `--border:rgba(0,0,0,0.1)` · `--radius:0.625rem`

`cn()` zorunlu · UI Kit dışı hex yasak · `@apply` yasak

## State

| Store                  | Sorumluluk                                                                           | Squad  |
| ---------------------- | ------------------------------------------------------------------------------------ | ------ |
| `useFormStore`         | Form draft, wizard                                                                   | 1      |
| `usePlanStore`         | Araç, yük listesi, placements                                                        | 2      |
| `useSceneStore`        | Katman, seçili kutu, animationState, violations, selectedInstanceId, requestSnapshot | 2      |
| `useAuthStore`         | Kullanıcı, rol, JWT                                                                  | 3      |
| `useSubscriptionStore` | Plan tipi, özellik erişimi                                                           | 3      |
| `useUIStore`           | Tema, sidebar                                                                        | Shared |

TanStack Query: key tuple `['items',filters]` · `error` state (onError değil) · queryFn içinde Zod parse zorunlu

## Form

`useState` ile form yasak. `fragility>=1` → Z ekseni kilitlenir, `useEffect` değil `onChange` içinde `form.setValue("allowRotateZ",false)`.

## Auth & RBAC

Token yalnızca `useAuthStore` — `localStorage` yasak · 401→`/auth/refresh` · kilitli özellik → modal (hard redirect değil)

## Raporlama

PDF: react-pdf `StyleSheet`, `React.lazy` zorunlu · Excel: formatlama `lib/utils/` · `/share/:token`: public, view-only

## Git

Branch: `feature/[squad]-[description]` · commit tekil · event: `plan:created`
