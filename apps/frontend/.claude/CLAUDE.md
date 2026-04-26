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
**CARGO PILOT**

3D Görselleştirme - Teknik Standartlar Eki

Squad 2 · Epic 1 · Nisan 2026

**Bu belge hakkında**

Ana geliştirme standartları dokümanının Squad 2'ye özel Three.js / R3F ekidir. Dosya yapısı, isimlendirme ve genel kurallar ana belgede tanımlıdır. Bu belgede yalnızca 3D katmanına özgü, Epic 1 kapsamında yazılacak kodla doğrudan ilişkili teknik kararlar yer alır.

# **1\. scene-config.ts - Merkezi Sabit Dosyası**

Ana belgede bu dosyanın koordinat mapping'ini tutacağı belirtilmiş ancak içeriği tanımlanmamış. Aşağıdaki sabitler bu dosyada merkezi olarak tutulur; bileşen içine hardcoded değer yazılmaz.

// lib/config/scene-config.ts

export const SCENE = {

CAMERA_POSITION: \[0, 8, 14\] as const,

CAMERA_FOV: 50,

ORBIT_MIN_DISTANCE: 2,

ORBIT_MAX_DISTANCE: 50,

LOAD_INTERVAL_MS: 380, // kutular arası bekleme

DROP_EASING: 0.12, // lerp faktörü

DROP_GLOW: 0.25, // düşerken emissiveIntensity

IDLE_GLOW: 0.06, // yerleştikten sonra

COLORS: {

VIOLATION: 0xDC2626, // ihlal - kırmızı

SELECTED: 0xfbbf24, // seçili kutu - sarı

GROUPS: {

A: 0xef4444, // Barcelona

B: 0x3b82f6, // Paris

C: 0xf59e0b, // Berlin

D: 0x22c55e, // Hassas yük

},

},

INSTANCED_THRESHOLD: 50,

} as const;

**Kural**

Squad 2 içindeki hiçbir bileşen bu dosyayı bypass ederek hardcoded hex veya sayısal sabit kullanamaz. Değişiklik gerekiyorsa yalnızca bu dosya güncellenir.

# **02 Işıklandırma Standartları**

Ana belgede iki satırla geçilmiş. Sahne atmosferi ve kutu ayrışması için üç ışık standardı uygulanır:

- Ambient light - sahnenin tamamına düşük yoğunluklu genel aydınlatma (intensity: 0.6)
- Directional light - gölge üreten ana ışık, sağ üstten gelir (position: \[10, 10, 5\], intensity: 1)
- Rim light - arka sol köşeden hafif mavi ton; kutular birbirine yakın yerleşince ayrışmayı sağlar, olmadan kutular iç içe geçmiş gibi görünür

&lt;ambientLight intensity={SCENE.AMBIENT_INTENSITY} /&gt;

&lt;directionalLight position={\[10,10,5\]} intensity={1} castShadow /&gt;

&lt;pointLight position={\[-8, 4, -6\]} intensity={0.3} color={0x4488ff} /&gt;

**Not**

Işık değerleri scene-config.ts'e taşınır. UI Kit teslim edilince materyal güncellemesi bu değerleri etkileyebilir - o aşamada burası da güncellenir. (tailwind zinc)

# **03 Yükleme Animasyonu - State Machine**

Brief'te isteniyor, ana belgede hiç yer almıyor. Kutular kapı tarafından başlayarak sırayla yerleşir.

## **State tanımı - useSceneStore'a eklenecek**

animationState: 'idle' | 'loading' | 'complete'

animationSpeed: number // 1 = normal, 0.5 = yavaş, 2 = hızlı

## **Akış**

- Kullanıcı butona basar → idle → loading
- Placement listesi sırayla işlenir, her kutu LOAD_INTERVAL_MS \* (1/animationSpeed) arayla eklenir
- Her kutu hedef Y'nin 1.5 birim üstünden başlar, DROP_EASING lerp ile aşağı iner
- Kutu hedefe ulaşınca DROP_GLOW → IDLE_GLOW geçişi yapılır
- Tüm kutular yerleşince → complete

## **useFrame içinde çalışacak mantık**

meshes.forEach(mesh => {

if (!mesh.userData.active) return;

const dist = mesh.userData.targetY - mesh.position.y;

if (Math.abs(dist) > 0.005) {

mesh.position.y += dist \* SCENE.DROP_EASING;

} else {

mesh.position.y = mesh.userData.targetY;

mesh.userData.active = false;

mesh.material.emissiveIntensity = SCENE.IDLE_GLOW;

}

});

## **Cancel mekanizması**

Animasyon devam ederken kullanıcı farklı bir plan seçerse animasyon yarıda kesilmeli, sahne temizlenmeli ve state idle'a dönmeli. Bu akış tanımlanmazsa loading state'inde takılı kalınır.

// usePlanStore'da plan değişince

useEffect(() => {

if (animationState === 'loading') {

cancelAnimation(); // interval temizle

clearScene(); // mesh'leri dispose et

setAnimationState('idle');

}

}, \[selectedPlanId\]);

**Kural**

useFrame içinde setState çağrısı yasaktır - React render döngüsünü tetikler. Animasyon durumu yalnızca useSceneStore.getState() ile güncellenir.

# **04 BoxWrapper - Animasyon Sırasında Pivot Offset**

Ana belgede BoxWrapper'ın neden gerekli olduğu açıklanmış (Bottom-Left-Rear → Center dönüşümü). Animasyon sırasında ek bir kural uygulanır.

Normal render'da offset bir kez hesaplanır. Animasyonda kutu her frame'de hareket ettiği için hem başlangıç hem hedef pozisyonuna offset uygulanmış olmalıdır. Yalnızca hedefe offset uygulanırsa kutu düşerken görsel olarak "zıplar".

// Başlangıç pozisyonu - offset dahil

const startY = targetY + 1.5 + height / 2;

// Hedef pozisyonu - offset dahil

const targetCY = positionY + height / 2;

InstancedMesh'te bu hesap setMatrixAt() her çağrıldığında matrix'e dahil edilir:

matrix.setPosition(

p.positionX + p.width / 2, // cx

currentY + p.height / 2, // cy - her frame güncellenir

p.positionZ + p.depth / 2 // cz

);

meshRef.current.setMatrixAt(i, matrix);

meshRef.current.instanceMatrix.needsUpdate = true;

# **05 InstancedMesh + Raycaster Farkı**

Ana belgede manuel Raycaster yasaklanmış, R3F onClick prop zorunlu tutulmuş. InstancedMesh kullanılınca onClick farklı davranır - bu fark manuel düzeltme özelliğini doğrudan etkiler.

Standart Mesh'te onClick eventi object referansı döndürür. InstancedMesh'te 50 kutu tek bir obje olduğu için event instanceId döndürür:

// Standart Mesh

onClick={(e) => e.object} // → doğrudan mesh referansı

// InstancedMesh

onClick={(e) => e.instanceId} // → 2 (kaçıncı instance?)

// placements\[e.instanceId\] ile hangi kutu olduğu bulunur

**Kritik**

Bu fark bilinmeden yazılan manuel düzeltme kodu çalışmaz. instanceId ile placements dizisini eşleştiren mantık useBoxSelection.ts hook'una izole edilmeli; diğer bileşenler seçim detayını bilmemeli.

## **useSceneStore'a eklenecek alan**

selectedInstanceId: number | null

Seçim yapılınca setMatrixAt ile o instance'a SCENE.COLORS.SELECTED uygulanır. İşlem bitince orijinal renk geri yüklenir.

# **06 Performans - useFrame Kuralları**

useFrame her saniye 60 kez çalışır. Aşağıdaki kurallar ihlal edilirse FPS düşer ve debug etmesi saatler alır.

## **Yasak - setState**

// ❌ YASAK - React render döngüsünü tetikler

useFrame(() => {

setCount(prev => prev + 1);

});

// ✅ DOĞRU - store.getState() ile direkt güncelle

useFrame(() => {

useSceneStore.getState().setSelectedBoxId(id);

});

## **Yasak - her frame'de yeni obje yaratmak**

// ❌ YASAK - GC baskısı yaratır, frame drop çıkar

useFrame(() => {

const vec = new THREE.Vector3(x, y, z);

});

// ✅ DOĞRU - dışarıda bir kez yarat, reuse et

const \_vec = new THREE.Vector3();

useFrame(() => {

\_vec.set(x, y, z);

});

## **Yasak - ağır hesaplamayı her frame'de yapmak**

// ❌ YASAK

useFrame(() => {

const sorted = placements.sort(...);

});

// ✅ DOĞRU - veri değişince useMemo ile hesapla

const sorted = useMemo(() => placements.sort(...), \[placements\]);

**Kural**

useFrame içinde sadece pozisyon/matris güncellemesi ve emissive geçişleri yapılır. Hesaplama, filtreleme ve state yazma işlemleri kesinlikle useFrame dışında kalır.

# **07 Violation - Görsel İhlal Sistemi**

Ana belgede yalnızca ihlal rengi tanımlı (0xDC2626).

## **useSceneStore'a eklenecek alan**

violations: { instanceId: number; reason: string }\[\]

setViolations: (v: Violation\[\]) => void

# **08 autoRotate - Kamera Başlangıç Davranış rotade mouse icon, /onboarding**

OrbitControls konfigürasyonu ana belgede var. Başlangıç davranışı tanımlanmamış.

- Kullanıcı sayfaya gelince kamera yavaşça döner - hem görsel, hem "bu döndürülebilir" mesajı verir
- İlk tıklamada autoRotate kapanır, bir daha açılmaz
- autoRotate ref ile tutulur - useState ile tutulursa her değişimde tüm canvas re-render alır

<OrbitControls

ref={orbitRef}

enableDamping

dampingFactor={0.05}

autoRotate

autoRotateSpeed={0.6}

minDistance={SCENE.ORBIT_MIN_DISTANCE}

maxDistance={SCENE.ORBIT_MAX_DISTANCE}

onStart={() => { orbitRef.current.autoRotate = false; }}

/>

# **09 Snapshot Zamanlaması**

Ana belgede gl.domElement.toDataURL() ile snapshot alınacağı yazılmış. Ne zaman alınacağı tanımlanmamış.

- Snapshot yalnızca animationState === 'complete' olduğunda alınabilir
- Animasyon devam ederken çağrılırsa kutular yarım pozisyonda PDF'e girer
- preserveDrawingBuffer: true ana belgede zaten zorunlu tutulmuş - bu doğru
- Snapshot isteği geldiğinde bir sonraki frame'de alınmalı - yarım frame yakalanmasın

// useSceneStore'a eklenecek

requestSnapshot: () => Promise&lt;string&gt; // base64 PNG döner

// Implementasyon

const requestSnapshot = () => new Promise&lt;string&gt;((resolve) => {

if (animationState !== 'complete') return;

requestAnimationFrame(() => {

resolve(gl.domElement.toDataURL('image/png'));

});

});



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

---

## Git Kuralları

- Branch format: `feature/[squad]-[description]` → `feature/squad1-product-form`
- Her commit tek mantıksal değişiklik içerir.
- CI geçmeyen PR merge edilmez.
- Event naming convention: `plan:created` formatı.
