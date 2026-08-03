---
description:
alwaysApply: true
---

---

description:
alwaysApply: true

---

# Cargo Pilot — Frontend Geliştirme Standartları

> Bu dosya Cargo Pilot projesinin tüm frontend geliştirme kurallarını tanımlar.
> Her geliştirici bu kurallara uymakla yükümlüdür. Cursor bu kuralları her kod önerisinde referans alır.

---

## Teknoloji Yığını

| Katman           | Teknoloji                                                  |
| ---------------- | ---------------------------------------------------------- |
| Framework        | React 18 + Vite 5+                                         |
| Dil              | TypeScript 5+ — **strict mode zorunlu**                    |
| Stil             | Tailwind CSS v3                                            |
| UI Bileşen       | shadcn/ui + Radix UI primitives                            |
| 3D               | Three.js r160+ · @react-three/fiber v8 · @react-three/drei |
| Form             | react-hook-form v7+ + zod v3+                              |
| Global State     | Zustand v4+                                                |
| Server State     | TanStack Query v5+                                         |
| Routing          | React Router v6+                                           |
| Raporlama        | react-pdf                                                  |
| Excel            | SheetJS / xlsx                                             |
| Paket Yöneticisi | **npm** (pnpm/yarn kullanılmaz)                            |
| Linting          | ESLint + Prettier + Husky                                  |
| Test             | Vitest · React Testing Library · Playwright                |

---

## Temel Prensipler

- **Tip Güvenliği**: Her veri noktası TypeScript ile tiplendirilir. `any` kullanılmaz.
- **SSOT**: Sunucu verisi yalnızca TanStack Query cache'inde yaşar. Zustand'a kopyalanmaz.
- **Bellek Yönetimi**: Three.js kaynakları (geometry, material, texture) unmount'ta `.dispose()` edilir.
- **Bileşen Saflığı**: shadcn dışı UI bileşeni yazılmaz. `cn()` ile genişletmek serbesttir.
- **PR Disiplini**: Her commit tek mantıksal değişiklik içerir. CI geçmeyen PR merge edilmez.

---

## Proje ve Klasör Yapısı

```
src/
├── pages/                  → React Router sayfa bileşenleri (route entry point'ler)
├── features/
│   ├── data-management/    → Squad 3 sorumluluk alanı
│   ├── planning/           → Squad 2 sorumluluk alanı
│   └── platform/           → Squad 1 sorumluluk alanı
├── components/
│   └── shared/             → Tüm squad'lerin kullandığı ortak bileşenler
├── lib/
│   ├── api/                → TanStack Query hook'ları ve fetcher fonksiyonları
│   ├── store/              → Zustand store slice'ları
│   ├── types/              → Paylaşılan TypeScript tipleri
│   ├── utils/              → Yardımcı fonksiyonlar
│   └── config/             → Ortam değişkenleri ve sabitler
└── assets/                 → Statik dosyalar (svg, font, görsel)
```

### Feature Klasörü İç Yapısı

```
features/data-management/
├── components/             → Bu feature'a özel bileşenler
│   ├── ProductForm.tsx
│   ├── ProductTable.tsx
│   └── ConstraintToggle.tsx
├── hooks/                  → Bu feature'a özel hook'lar
│   └── useProductForm.ts
├── schemas/                → Zod şemaları
│   └── productSchema.ts
└── types/                  → Feature'a özel tipler (lib/types'a taşınana kadar)
```

> API hook'ları feature klasörüne **değil**, `lib/api/` altına yazılır.

### İsimlendirme Kuralları

| Tür                     | Kural                                                 |
| ----------------------- | ----------------------------------------------------- |
| React bileşen dosyası   | PascalCase → `ProductForm.tsx`                        |
| Hook dosyası            | camelCase, use prefix → `useProductForm.ts`           |
| Store dosyası           | camelCase, Store suffix → `usePlanStore.ts`           |
| Zod şema dosyası        | camelCase, Schema suffix → `productSchema.ts`         |
| Util dosyası            | camelCase → `formatWeight.ts`                         |
| Klasör adı              | kebab-case → `data-management/`                       |
| Test dosyası            | Kaynak ile aynı ad + `.test` → `ProductForm.test.tsx` |
| Tip dosyası (lib/types) | camelCase → `loadingPlan.ts`                          |

> **`index.ts` barrel export dosyaları YASAKTIR.** Her dosya doğrudan import edilir.

---

## TypeScript Standartları

### Temel Kurallar

- `strict: true` — `tsconfig.json`'da zorunludur.
- `any` kullanılmaz — bilinmeyen tipler için `unknown` kullanılır, ardından type guard yazılır.
- `as` casting — sadece runtime'da imkânsız durumlar için; form field'larında kullanılmaz.
- Paylaşılan tipler — `Item`, `Vehicle`, `Placement`, `LoadingPlan` tipleri `lib/types/` altında tutulur.
- Form ve API modelleri için manuel `interface` yazılmaz — önce Zod şeması, sonra `z.infer<typeof Schema>`.

### API Response Tipleme

```typescript
// lib/types/item.ts
import { z } from 'zod';

export const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  weight: z.number().positive(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int().min(1),
});

// TypeScript tipi Zod'dan otomatik türetilir — ayrıca interface yazılmaz
export type Item = z.infer<typeof itemSchema>;
```

### Enum Tanımlama

```typescript
// ❌ YASAK — TypeScript enum
enum FragilityType {
  NonFragile = 0,
  Fragile = 1,
  Liquid = 2,
}

// ✅ ZORUNLU — const object + as const + union type
export const FragilityType = {
  NonFragile: 0,
  Fragile: 1,
  Liquid: 2,
} as const;

export type FragilityType = (typeof FragilityType)[keyof typeof FragilityType];
```

---

## Bileşen Standartları

### shadcn/ui Kullanım Kuralları

- Tüm UI bileşenleri `shadcn/ui`'dan çağrılır. Sıfırdan UI bileşeni yazılmaz.
- `cn()` kullanımı serbesttir — ek `className` vermek için kullanılır.
- Yeni bileşen ihtiyacında önce shadcn registry kontrol edilir, sonra Chapter Lead'e danışılır.
- Radix primitive'leri doğrudan kullanılabilir; ham HTML elementi değil.

```typescript
// ✅ DOĞRU
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrimaryAction({ className, ...props }) {
  return <Button className={cn("w-full font-semibold", className)} {...props} />;
}

// ❌ YASAK — sıfırdan button
export function MyButton({ children }) {
  return <button className="bg-blue-600 px-4 py-2">{children}</button>;
}
```

### Bileşen Yazım Kuralları

- **Fonksiyon bileşeni** — class component yazılmaz.
- **Named export** — `default export` kullanılmaz.
- **Props interface** — her bileşenin props'u ayrı interface ile tanımlanır.
- **`React.FC` kullanılmaz** — props tipi doğrudan parametre üzerinden verilir.

```typescript
// ✅ DOĞRU
interface ProductCardProps {
  item:       Item;
  onSelect:   (id: string) => void;
  isSelected?: boolean;
}

export function ProductCard({ item, onSelect, isSelected = false }: ProductCardProps) {
  return (
    <Card
      className={cn("cursor-pointer", isSelected && "ring-2 ring-blue-500")}
      onClick={() => onSelect(item.id)}
    >
      <CardContent>{item.name}</CardContent>
    </Card>
  );
}

// ❌ YASAK
export default function ProductCard(props: any) { ... }
const ProductCard: React.FC<Props> = (props) => { ... }
```

### Tasarım Token'ları

UI Kit token'ları `global.css` içinde CSS değişkeni olarak tanımlanır, `tailwind.config.ts` üzerinden yansıtılır.

```css
/* src/index.css */
@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;

    /* Yüzen paneller (Modal, Toast, Drawer) ve katmanlar arası geçişler için (Geçici skeleton değerler) */
    --surface-overlay: 255 255 255 / 0.13;
    --overlay-blur: 12px;
    --radius-xl: 1rem;
  }
}
```

### Tailwind Kullanım Kuralları

- **Utility-first** — Satır içi Tailwind class'ları kullanılır. Harici CSS dosyası yazılmaz.
- **`cn()` zorunlu** — koşullu class birleştirme için. String concatenation yasak.
- **Özel renk yasak** — UI Kit'ten gelmeyen hex renk veya opacity doğrudan class'a yazılmaz.
- **`@apply` yasak** — Tailwind'in `@apply` direktifi kullanılmaz.

```typescript
// ✅ DOĞRU
className={cn(
  "flex items-center gap-2 rounded-md px-4 py-2",
  isActive   && "bg-blue-600 text-white",
  isDisabled && "opacity-50 cursor-not-allowed",
)}

// ❌ YASAK
className={"flex " + (isActive ? "bg-blue-600" : "")}
style={{ backgroundColor: "#2563EB" }}
```

---

## State Yönetimi

### İki Katmanlı Mimari

| Katman             | Kullanım                                                          |
| ------------------ | ----------------------------------------------------------------- |
| **TanStack Query** | Backend API verisi, cache, stale time, refetch, optimistic update |
| **Zustand**        | Saf UI state: aktif rol, tema, 3D filtre durumu, seçili plan      |

> **Sunucudan gelen veri (API response) asla Zustand'a yazılmaz.**

### Zustand Store Slice'ları

| Store Slice            | Sorumluluk                                                    | Squad   |
| ---------------------- | ------------------------------------------------------------- | ------- |
| `useFormStore`         | Form draft state'leri, step wizard                            | Squad 1 |
| `usePlanStore`         | Seçili araç, yük listesi, optimizasyon kriteri, placements    | Squad 2 |
| `useSceneStore`        | Aktif katman filtresi, seçili kutu ID'si, wireframe/solid mod | Squad 2 |
| `useAuthStore`         | Aktif kullanıcı, rol, JWT token, oturum durumu                | Squad 3 |
| `useSubscriptionStore` | Plan tipi, expiry, özellik erişim hakları                     | Squad 3 |
| `useUIStore`           | Tema, sidebar durumu, global bildirim listesi                 | Shared  |

```typescript
// lib/store/usePlanStore.ts
import { create } from 'zustand';
import type { Vehicle, Item, OptimizationCriteria } from '@/lib/types';

interface PlanStore {
  selectedVehicle: Vehicle | null;
  selectedItems: Array<{ item: Item; quantity: number }>;
  criteria: OptimizationCriteria;
  setVehicle: (vehicle: Vehicle) => void;
  addItem: (item: Item, qty: number) => void;
  setCriteria: (c: OptimizationCriteria) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedVehicle: null,
  selectedItems: [],
  criteria: 0,
  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  addItem: (item, qty) =>
    set((s) => ({
      selectedItems: [...s.selectedItems, { item, quantity: qty }],
    })),
  setCriteria: (criteria) => set({ criteria }),
  reset: () => set({ selectedVehicle: null, selectedItems: [], criteria: 0 }),
}));
```

### TanStack Query Kuralları

- Hook'lar `lib/api/` altında yazılır. Feature klasörüne taşınmaz.
- Query key tuple formatı: `['items', filters]` — string key kullanılmaz.
- `onError` callback yerine `error` state kullanılır (v5 standardı).
- Mutation'larda optimistic update uygulanır.

```typescript
// lib/api/useItems.ts
export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ['items', filters],
    queryFn: async () => {
      const res = await fetch('/api/v1/items');
      const data = await res.json();
      return itemSchema.array().parse(data.data); // Zod runtime doğrulama
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Form Yönetimi

Her form `react-hook-form + Zod` ile yazılır. `useState` ile kontrollü input yönetimi yapılmaz.

```typescript
// features/data-management/schemas/productSchema.ts
export const productSchema = z
  .object({
    name: z.string().min(1, 'validations.product.nameRequired'),
    sku: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    length: z.number().positive(),
    weight: z.number().positive(),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1).optional(),
    fragility: z.number().int().min(0).max(2),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
  })
  .refine((data) => !data.isStackable || data.maxStackCount !== undefined, {
    message: 'validations.product.maxStackRequired',
    path: ['maxStackCount'],
  });

export type ProductFormValues = z.infer<typeof productSchema>;
```

### Bağımlı Alan Kuralı (useEffect Tuzağı)

Hassas ürün (`fragility >= 1`) seçilince Z ekseni otomatik kilitlenir.
`useEffect` değil, tetikleyici alanın `onChange` eventi içinde `form.setValue` kullanılır.

```typescript
// ✅ DOĞRU — onChange içinde bağımlı alanı güncelle
onValueChange={(value) => {
  const numValue = Number(value);
  field.onChange(numValue);
  if (numValue >= 1) form.setValue("allowRotateZ", false);
}}

// Sadece disable durumunu okumak için useWatch kullan
const fragility = useWatch({ control: form.control, name: "fragility" });
```

---

## 3D Sahne: R3F ve Three.js Standartları

### Koordinat Sistemi

| Eksen    | Anlam                                          |
| -------- | ---------------------------------------------- |
| X        | Genişlik — Width (sol-sağ)                     |
| Y        | Yükseklik — Height (yukarı-aşağı)              |
| Z        | Derinlik — Depth / Length (öne-arkaya)         |
| Origin   | Kutunun Sol-Alt-Arka (Bottom-Left-Rear) köşesi |
| Rotasyon | Derece (0, 90, 180, 270)                       |

Koordinat mapping'i `lib/config/scene-config.ts` dosyasında merkezi olarak tanımlanır.

### BoxWrapper Zorunluluğu

Three.js'in pivot'u merkezde, backend'in pivot'u Sol-Alt-Arka köşededir. Bu fark `BoxWrapper` ile çözülür.

```typescript
// components/shared/BoxWrapper.tsx
export function BoxWrapper({ width, height, depth, positionX, positionY, positionZ, color = "#2563EB", opacity = 0.85, onClick, itemId }: BoxWrapperProps) {
  // Pivot offset: her eksende boyutun yarısı kadar kaydır
  const cx = positionX + width  / 2;
  const cy = positionY + height / 2;
  const cz = positionZ + depth  / 2;

  return (
    <mesh position={[cx, cy, cz]} onClick={(e) => { e.stopPropagation(); onClick?.(itemId!); }}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

// ❌ YASAK — offset hesaplanmadan doğrudan koordinat
// <mesh position={[p.positionX, p.positionY, p.positionZ]}>
```

> 50+ kutu senaryosunda `BoxWrapper` değil, `InstancedMesh` kullanılır (bkz. aşağısı).

### Canvas Kurulumu

```typescript
<Canvas
  camera={{ position: [0, 8, 14], fov: 50 }}
  gl={{ antialias: true, preserveDrawingBuffer: true }} // PNG export için zorunlu
  shadows
  style={{ width: "100%", height: "100%" }}
>
  <ambientLight intensity={0.6} />
  <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
  <OrbitControls
    enableDamping
    dampingFactor={0.05}   // ZORUNLU
    minDistance={2}
    maxDistance={50}
  />
</Canvas>
```

### InstancedMesh Zorunluluğu

50'den fazla kutu render ediliyorsa ayrı `<mesh>` bileşeni kullanılmaz, `InstancedMesh` kullanılır.

```typescript
export function CargoMeshInstanced({ planId }: { planId: string }) {
  const meshRef    = useRef<THREE.InstancedMesh>(null);
  const placements = usePlanStore((s) => s.placements);

  useEffect(() => {
    if (!meshRef.current) return;
    const matrix = new THREE.Matrix4();
    const color  = new THREE.Color();
    placements.forEach((p, i) => {
      matrix.setPosition(p.positionX, p.positionY + p.height / 2, p.positionZ);
      meshRef.current!.setMatrixAt(i, matrix);
      meshRef.current!.setColorAt(i, color.set(p.isViolation ? 0xDC2626 : 0x2563EB));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [placements]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, placements.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
```

### Memory Yönetimi — Dispose Zorunluluğu

Manuel `THREE` nesnesi oluştururken `useEffect` cleanup içinde mutlaka `dispose` edilir.

```typescript
useEffect(() => {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({ color });
  return () => {
    geometry.dispose();
    material.dispose();
  };
}, [w, h, d, color]);
```

> R3F JSX syntax kullanıldığında R3F otomatik dispose yapar. Manuel THREE nesnesinde zorunludur.

### Raycasting

```typescript
// ✅ DOĞRU — R3F onClick prop
<mesh onClick={(e) => { e.stopPropagation(); useSceneStore.getState().setSelectedBoxId(id); }}>

// ❌ YASAK — Manuel Raycaster
const raycaster = new THREE.Raycaster();
window.addEventListener("click", (e) => { ... });
```

### Katman Bazlı Görüntüleme

```typescript
const activeLayer = useSceneStore((s) => s.activeLayer);

<group visible={placement.layer <= activeLayer} userData={{ layer: placement.layer }}>
  {/* kutu mesh'i */}
</group>

// ❌ YASAK — imperative mutasyon
// group.visible = sliderValue >= layer;
```

---

## Routing, Auth ve RBAC

### Korumalı Route Pattern

```typescript
function ProtectedRoute({ requiredRole }: { requiredRole?: UserRole }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/error" replace />;
  return <Outlet />;
}
```

### JWT ve Token Yönetimi

- **Access token yalnızca `useAuthStore`'da tutulur. `localStorage`'a yazılmaz.**
- Axios interceptor — her isteğe `Authorization` header otomatik eklenir.
- 401 alındığında `/auth/refresh` çağrılır; başarısızsa login'e yönlendirilir.
- 2FA — Billing, kullanıcı silme ve ERP ayarları için zorunludur (backend enforce eder).

### Abonelik Kilitleme

Hard redirect değil, **modal pattern** kullanılır.

```typescript
function LockedFeatureButton({ feature, children }) {
  const hasAccess  = checkFeatureAccess(feature);
  const [showUpgrade, setShowUpgrade] = useState(false);
  return (
    <>
      <Button onClick={() => hasAccess ? doAction() : setShowUpgrade(true)}
              variant={hasAccess ? "default" : "outline"}>
        {!hasAccess && <Lock className="mr-2 h-4 w-4" />}
        {children}
      </Button>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
```

---

## Raporlama ve Çıktı Yönetimi

### PDF Export (react-pdf)

- Tasarımsal bütünlük için Tailwind değil, kütüphanenin kendi `StyleSheet` yapısı kullanılır.
- Ağır olduğu için `React.lazy` ile dinamik import (code splitting) yapılır.
- 3D snapshot: `gl.domElement.toDataURL("image/png")` → prop olarak PDF bileşenine geçilir → `<Image />` ile basılır.

### Excel Export (SheetJS)

Veri formatlama `lib/utils/` katmanında yapılır, bileşen içine yazılmaz.

```typescript
export function exportPlanToExcel(plan: LoadingPlan, items: Item[]): void {
  const rows = plan.placementDetails.map((p) => ({
    'Ürün Adı': items.find((i) => i.id === p.itemId)?.name ?? '-',
    'Konum (X,Y,Z)': `${p.positionX}, ${p.positionY}, ${p.positionZ}`,
    Rotasyon: `${p.rotation}°`,
    'Hata Durumu': p.isViolation ? 'Kural İhlali' : 'Uygun',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Yükleme Planı');
  XLSX.writeFile(wb, `CargoPilot_Plan_${plan.id.slice(0, 8)}.xlsx`);
}
```

### Plan Paylaşım Linki (`/share/:token`)

- Public route — kimlik doğrulama gerektirmez.
- 3D sahne view-only modda: `OrbitControls` aktif, `onClick` devre dışı.
- Token süresi dolmuşsa hata sayfasına yönlendir.
- Düzenleme aksiyonları render edilmez.
