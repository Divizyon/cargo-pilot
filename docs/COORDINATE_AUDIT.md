# Koordinat Sistemi Denetimi (Coordinate Audit)

**Referans standart:** [`COORDINATE_STANDARD.md`](./COORDINATE_STANDARD.md) ·
[`coordinate-standard.html`](./coordinate-standard.html)
**Tarih:** 2026-08-12 · **Sürüm:** 2 (yeni standarda göre baştan yazıldı)
**Kapsam:** `apps/frontend/src`, `apps/backend`, repo kökündeki prototip HTML,
`.claude` doküman dosyaları
**Kapsam dışı:** `node_modules`, `bin`/`obj`, EF Core migration snapshot'ları,
`.claude/worktrees` kopyaları

> Bu denetim **yalnızca rapordur** — hiçbir kaynak dosya değiştirilmemiştir.

> **Sürüm 1'e göre ne değişti:** origin sağ-alt yerine **sol-alt**, `depth` yerine
> **`length`**, kapılar front/rear/sağ/sol yerine **small/big**. Bunun sonucunda önceki
> denetimde ihlal sayılan bazı maddeler **artık uyumludur** — bkz. bölüm 4
> ("Artık uyumlu — dokunulmayacak"). O bölümü okumadan düzeltmeye başlamayın; aksi
> hâlde doğru olan kodu bozarsınız.

---

## 1. Özet

### 1.1 Severity dağılımı

| Severity   | Adet |
| ---------- | ---- |
| **High**   | 9    |
| **Medium** | 15   |
| **Low**    | 8    |
| **Toplam** | **32** |

### 1.2 Dosya bazında dağılım

| Dosya | High | Med | Low | Bulgular |
| ----- | ---- | --- | --- | -------- |
| `apps/backend/…/Optimization/LifoPlacement.cs` | 1 | – | – | H-01 |
| `apps/backend/…/Optimization/OptimizationEngine.cs` | 1 | – | – | H-09 |
| `apps/backend/…/Optimization/VolumeScoring.cs` | – | 1 | – | M-11 |
| `apps/backend/CargoPilot.Domain/Enums/LoadingType.cs` | 1 | – | – | H-07 |
| `apps/backend/…/Models/OptimizationResult.cs` | – | 1 | – | M-11 |
| `apps/backend/…/Shares/GetSharePlanByToken/SharePlanDto.cs` | – | 1 | – | M-11 |
| `…/planning/scene/components/ContainerMesh.tsx` | 1 | 1 | – | H-02, M-02 |
| `…/planning/scene/hooks/useLoadingAnimation.ts` | 1 | – | – | H-03 |
| `…/lib/utils/scene/loadOrder.ts` | 1 | – | – | H-04 |
| `…/lib/utils/geometry/calcCenterOfGravity.ts` | 1 | 1 | – | H-05, M-13 |
| `…/data-management/vehicles/components/VehiclePreview3D.tsx` | 1 | 1 | – | H-06, M-02 |
| `…/lib/types/vehicle.ts` | 1 | – | – | H-07 |
| `…/data-management/vehicles/components/VehicleDimensionsFields.tsx` | 1 | – | – | H-10 |
| `…/lib/types/loadingPlan.ts` | – | 1 | 1 | M-00, L-05 |
| `…/lib/types/share.ts` | – | 1 | – | M-00 |
| `…/lib/store/usePlanStore.ts` | – | 2 | 1 | M-00, M-12, L-03 |
| `…/lib/api/loadingPlanMappers.ts` | – | 2 | – | M-00, M-12 |
| `…/lib/api/vehicleMappers.ts` | – | 1 | – | M-01 |
| `…/lib/config/scene-config.ts` | – | 1 | – | M-03 |
| `…/lib/utils/scene/sceneFilter.ts` | – | 2 | – | M-00, M-04 |
| `…/planning/scene/components/CameraPresetButtons.tsx` | – | 1 | – | M-05 |
| `…/planning/scene/components/CargoMeshInstanced.tsx` | – | 1 | – | M-06 |
| `…/planning/scene/components/BoxWrapper.tsx` | – | 1 | – | M-07 |
| `…/planning/scene/CLAUDE.md` · `apps/frontend/.claude/CLAUDE.md` | – | 1 | – | M-08 |
| `…/products/components/ProductTable.tsx` | – | 1 | – | M-09 |
| `…/imports/components/ERPItemsTable.tsx` | – | 1 | – | M-09 |
| `…/imports/components/BulkImportDialog.tsx` | – | 1 | 1 | M-09, L-07 |
| `…/products/components/ProductForm.tsx` | – | 1 | – | M-10 |
| `…/lib/utils/geometry/geometry.ts` | – | 1 | – | M-13 |
| `…/lib/utils/geometry/checkOrientationFit.ts` | – | 1 | 1 | M-13, L-08 |
| `tip1_animasyonlu_planlayici (1).html` (repo kökü) | – | 1 | – | M-14 |
| `…/lib/utils/export/export-utils.ts` | – | – | 1 | L-01 |
| `…/planning/scene/components/SelectedBoxCoords.tsx` | – | – | 1 | L-02 |
| `…/lib/utils/geometry/boxOrientations.ts` | – | – | 1 | L-04 |
| `…/lib/utils/geometry/calcVolume.ts` | – | – | 1 | L-06 |
| `…/imports/components/VehicleBulkImportDialog.tsx` | – | – | 1 | L-07 |

### 1.3 Üç kök neden

**KÖK-1 — `z` ekseni yönü ters.**
Kod genelinde `z = 0` **kapı**, `z = length` **kabin/uzak uç** kabul edilir. Standartta tam
tersi: `z = 0` uzak yüz, `z = length` referans kapı. Tek başına bu fark 6 dosyayı doğrudan
bozuyor (H-01…H-06) ve 2 dosyayı dolaylı etkiliyor (M-04, M-05).

**KÖK-2 — Kapı modeli eski.**
Kapılar hâlâ `front / rear / side / top` yön enum'u olarak tutuluyor; standart
`small / big` tipi + yüz (`z=length`, `x=0`, `x=width`) çifti ve **liste** istiyor. Bir
araçta aynı anda birden fazla kapı olabildiği için tekil enum bilgi kaybediyor (H-07,
M-01, M-02).

**KÖK-3 — `depth` terimi.**
`z` boyutu frontend'de `depth`, backend DTO'larında `Depth` olarak taşınıyor; standart
terim artık **`length`**. Frontend'de 23 dosya, 117 kullanım (M-00, M-11, M-12).

---

## 2. Bulgular

### H-01 · `z = 0` kapı kabul ediliyor (motor) — **HIGH**

**Dosya:** `apps/backend/CargoPilot.Application/Common/Optimization/LifoPlacement.cs:36-40`

```csharp
// Arka kapı Z=0'dadır. UnloadingOrder=1 ilk inecek gruptur, bu yüzden kapıya
// en yakın (en küçük Z) bölgeye düşer.
```

**Kullanılan konvansiyon:** `z = 0` → kapı; `z = VehicleLength` → uzak uç.
**İhlal:** Standartta `z = 0` uzak yüz, `z = length` referans kapıdır. LIFO bölgeleri ters
uçtan başlıyor; ilk inecek grup fiilen kapının en uzağına yerleşiyor.
**Fix:** Bölge indekslemesini tersine çevir (`ZStart = length − (i+1)·zoneSize`) ya da tek
noktada `z' = length − z − d` dönüşümü uygula.

---

### H-02 · Kapı meshleri ters uçlarda — **HIGH**

**Dosya:** `apps/frontend/src/features/planning/scene/components/ContainerMesh.tsx:302-348`

```tsx
case 'rear':
  // Arka kapı: Z=0 yüzü
  return (<group position={[0, 0, 0]}><RearDoors .../></group>);
...
default:
  // 'front' veya undefined — ön yüz (Z=length)
  return (<group position={[0, 0, length]}><RearDoors .../></group>);
```

**Kullanılan konvansiyon:** kapı `z = 0`, "ön yüz" `z = length`.
**İhlal:** Standartta referans kapı `z = length`, uzak yüz `z = 0`. Ayrıca **"front door"
diye bir kapı yok** — default dalı geçersiz bir kapıyı çiziyor. Dosya içindeki
`SideDoor` / `TopDoor` yorumları (satır 198-201, 240, 253, 314) da `Z=0`'ı "arka" olarak
adlandırıyor.
**Fix:** Referans kapıyı `position={[0,0,length]}`'e taşı, `front` dalını kaldır, kapı
seçimini `doors` listesine göre yap.

---

### H-03 · Yükleme animasyonu yanlış uçtan giriyor — **HIGH**

**Dosya:** `apps/frontend/src/features/planning/scene/hooks/useLoadingAnimation.ts:110-139`

```ts
case 'rear':
  // Arka kapı: Z=0 önünden girer
  fromZ = -OFFSET;
  break;
...
default:
  // 'front' veya undefined — Z=depth önünden girer
  fromZ = depth + OFFSET;
```

**İhlal:** Referans kapı `z = length`'te olduğu için kutular kapıdan değil, uzak duvarın
(TIR'da kabinin) içinden geçerek giriyor. Ayrıca parametre adı `vehicleDepth` (satır 63-64)
— standart terim `length`.
**Fix:** Referans kapı için `fromZ = length + OFFSET`; big door için `fromX = −OFFSET`
(x = 0 yüzü) veya `width + OFFSET` (x = width yüzü).

---

### H-04 · Yükleme sırası ters yönde — **HIGH**

**Dosya:** `apps/frontend/src/lib/utils/scene/loadOrder.ts:5-18, 31-66`

```ts
 * rear  (Z=0):       Z büyük→küçük, sonra Y küçük→büyük (alt kat önce), X küçük→büyük
 * front (Z=length):  Z küçük→büyük, sonra Y küçük→büyük, X küçük→büyük
```

**İhlal:** Standarda göre yükleme her zaman `z = 0`'dan (uzak yüz) `z = length`'e (kapı)
doğru ilerler. `rear` dalındaki `z` azalan sıralama tam tersi. `front` dalı ise artık
karşılığı olmayan bir kapı tipini temsil ediyor.
**Fix:** Referans kapı yüklemesinde `z` **artan**; big door yüklemesinde kapının olduğu
yüzden uzağa doğru `x` sıralaması.

---

### H-05 · Dingil yükü payları ters — **HIGH**

**Dosya:** `apps/frontend/src/lib/utils/geometry/calcCenterOfGravity.ts:38, 105, 122-124`

```ts
/** Front axle load share (0..1) — Z=0 is rear, Z=containerLength is front */
...
// Moment-based axle shares: rear axle at Z=0, front axle at Z=containerLength
const frontAxleShare = containerLength > 0 ? cog.z / containerLength : 0.5;
```

**Kullanılan konvansiyon:** `z = 0` → arka aks, `z = length` → ön aks (kabin).
**İhlal:** Standartta `z = 0` uzak yüz = **kabin ucu**, `z = length` back door. Yani
`frontAxleShare` fiilen **arka** aksın payını veriyor. Ağırlık merkezi kabine yakınken
arayüz "arka aks yüklü" diyor — güvenlik/mevzuat açısından en riskli bulgu.
**Fix:** `frontAxleShare = 1 − cog.z / length`; yorumları ve `containerLength` parametre
adını (`length`) standarda göre düzelt.

---

### H-06 · Çekici kabini yanlış uçta modellenmiş — **HIGH**

**Dosya:** `apps/frontend/src/features/data-management/vehicles/components/VehiclePreview3D.tsx:283, 354-366`

```tsx
<group position={[0, 0, cargoLength + gapLength]}>   {/* kabin */}
...
{/* Ön kapı — Z=length yüzü */}   {isFront && <mesh position={[width/2, height/2, length + …]}>}
{/* Arka kapı — Z=0 yüzü */}      {isRear  && <mesh position={[width/2, height/2, -…]}>}
```

**İhlal:** Standartta kabin (uzak yüz) `z = 0`'dadır ve **front door yoktur**. Önizleme,
kabini `z = length` ucuna koyup back door'u `z = 0`'a alarak ekseni tersine çeviriyor.
**Fix:** Kabini `z < 0` tarafına al, back door'u `z = length` yüzüne taşı, `isFront`
dalını kaldır.

---

### H-07 · Kapı modeli standarda uymuyor — **HIGH**

**Dosyalar:** `apps/frontend/src/lib/types/vehicle.ts:11-18` ·
`apps/backend/CargoPilot.Domain/Enums/LoadingType.cs:3-9`

```ts
export const DoorDirection = {
  Front: 'front', Rear: 'rear', Side: 'side', Top: 'top', RearAndSide: 'rearAndSide',
} as const;
```

```csharp
public enum LoadingType { Rear = 0, SideRight = 1, SideLeft = 2, SideBoth = 3, Top = 4 }
```

**Kullanılan konvansiyon:** Kapı = tekil yön enum'u (front/rear/side/top).
**İhlal:** Üç ayrı ihlal bir arada:
1. Standart kapıları **boyuta** göre sınıflar (`small` / `big`), yöne göre değil.
2. **`Front` diye bir kapı yoktur** — frontend bu değeri tanımlıyor ve `ContainerMesh`
   default dalında kullanıyor (H-02).
3. Kapı bilgisi **liste** olmalı; bir araçta small door + iki big door aynı anda
   bulunabilir. Tekil enum bunu ifade edemiyor (`SideBoth` bilgi kaybıyla tek tarafa
   düşüyor — M-01).

**Fix:** `doors: Array<{ type: 'small' | 'big'; face: 'z=0' | 'z=length' | 'x=0' | 'x=width' }>`
modeline geç; backend enum'unu bu listeye eşleyen bir migration + uyumluluk katmanı yaz.
`top` kapının karşılığı sektör araştırmasına bağlı (bkz. bölüm 5).

---

### H-09 · Big door açıklık payı (`x₀`) hiçbir yerde uygulanmıyor — **HIGH** 🔒

**Dosya:** `apps/backend/CargoPilot.Application/Common/Optimization/OptimizationEngine.cs:39, 86-92`

```csharp
var extremePoints = new HashSet<(decimal x, decimal y, decimal z)> { (0m, 0m, 0m) };
...
if (ex + w > input.VehicleWidth)  continue;
```

**Kullanılan konvansiyon:** Yerleştirme her zaman `x = 0`'dan başlar, `x` üst sınırı
`VehicleWidth`.
**İhlal:** Standart, big door `x = 0` yüzündeyse yüklemenin `(x₀, 0, 0)`'dan başlamasını
istiyor. Motorda ne `x₀` kavramı ne de big door'un hangi yüzde olduğu bilgisi var.
**Fix:** `OptimizationInput`'a `xMin` (ve gerekirse `xMax`) ekle; tohum noktasını ve sınır
kontrolünü buna göre kur.
🔒 **Bloke:** `x₀` değeri henüz tanımlı değil (bkz. bölüm 5). Değer netleşmeden
uygulanamaz.

---

### H-10 · Araç formunda eksen etiketleri takas — **HIGH**

**Dosya:** `apps/frontend/src/features/data-management/vehicles/components/VehicleDimensionsFields.tsx:37-43, 107-113`

```tsx
{/* X — Uzunluk */}
<FormField name="length" ... <FormLabel>Uzunluk/Çap (X)</FormLabel>   // placeholder 1350
{/* Z — Derinlik */}
<FormField name="width"  ... <FormLabel>Derinlik (Z)</FormLabel>      // placeholder 240
```

**Kullanılan konvansiyon:** `length → x`, `width → z`.
**İhlal:** Sahne bunun tam tersini yapıyor — `ContainerMesh` `boxGeometry args={[width,
height, length]}` ile `width → x`, `length → z` eşliyor. Standarda göre de doğru olan
sahnedeki eşleme. Form etiketleri hem eksen hem terim olarak yanlış: `length` alanı "(X)"
diyor, `width` alanı "Derinlik (Z)" diyor. Değerler tesadüfen fiziksel olarak doğru yere
düştüğü için hata sessiz.
**Fix:** `length` → `Uzunluk (Z)`, `width` → `Genişlik (X)`, `height` → `Yükseklik (Y)`.

---

### M-00 · `depth` terimi tip sözleşmesinde — **MEDIUM**

**Dosyalar:** `lib/types/loadingPlan.ts:36` · `lib/types/share.ts:60` ·
`lib/utils/geometry/calcCenterOfGravity.ts:9,64,91` · `lib/utils/geometry/geometry.ts:15-16` ·
`lib/utils/geometry/checkOrientationFit.ts:6,29` · `lib/utils/geometry/boxOrientations.ts:66,80-86` ·
`lib/utils/scene/sceneFilter.ts:5` · `lib/store/usePlanStore.ts:53,66,164,216,248,708-717` ·
`lib/api/loadingPlanMappers.ts:386` — toplam **23 dosya, 117 kullanım**

```ts
export const placementWithDimensionsSchema = placementSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
```

**İhlal:** Standart terim **`length`**; `depth` açıkça yasak. Bugün geometriyi bozmuyor —
değer doğru eksende — ancak aynı fiziksel büyüklük sistemde iki adla dolaşıyor
(`item.length` ↔ `placement.depth`) ve bu, standardın yasakladığı belirsizliğin ta
kendisi.
**Fix:** `depth` → `length` yeniden adlandırması; `placementWithDimensionsSchema` bu
zincirin başı olduğu için önce orası. Rename mekanik ama 23 dosyaya dokunduğu için tek bir
PR'da, davranış değişikliği olmadan yapılmalı.

---

### M-01 · `LOADING_TYPE_FROM_INT` eşlemesi bilgi kaybediyor — **MEDIUM**

**Dosya:** `apps/frontend/src/lib/api/vehicleMappers.ts:29-45` ·
test: `vehicleMappers.test.ts:114`

```ts
// SideBoth: hem sağ hem sol kapı var, frontend'de tek bir "her iki taraf" kavramı yok.
3: { direction: DoorDirection.Side },
```

**İhlal:** Standart, iki big door'u ayrı ayrı modelliyor; `SideBoth` tek bir belirsiz
`side` değerine düşürülüyor ve `doorSide` tanımsız kalıp "sağ kapı" varsayımına iniyor.
Ayrıca bilinmeyen `loadingType` değeri testte `Front` varsayılanına düşüyor — `Front`
artık geçersiz bir kapı.
**Fix:** Eşlemeyi `doors` listesine çevir: `3 → [{type:'big',face:'x=0'},{type:'big',face:'x=width'}]`.

---

### M-02 · "sağ / sol kapı" adlandırması — **MEDIUM**

**Dosyalar:** `ContainerMesh.tsx:295-311` · `VehiclePreview3D.tsx:349-350, 368` ·
`vehicleSchema.ts:69` · `loadOrder.ts:38-45`

```tsx
// doorSide: 'right' → X=width yüzü (+X), 'left' veya undefined → X=0 yüzü (-X)
const sideX = doorSide === 'right' ? width + DOOR_PANEL_T / 2 : -DOOR_PANEL_T / 2;
```

**Durum:** Eşlemenin **yönü doğru** — standartta da kapı görünümünde sağ = `x = width`
(bkz. bölüm 4, "Artık uyumlu"). İhlal edilen, adlandırma kuralı: standart "sağ kapı" /
"sol kapı" kavramını kaldırıp `big door` + yüz çiftini koyuyor.
**Fix:** `doorSide: 'right' | 'left'` → `face: 'x=0' | 'x=width'`. Yön mantığına
dokunulmaz, yalnızca ad ve tip değişir.

---

### M-03 · Kamera preset adları standartla uyuşmuyor — **MEDIUM**

**Dosya:** `apps/frontend/src/lib/config/scene-config.ts:105-112`

```ts
CAMERA_PRESETS: {
  TOP:        { dir: [0, 1, 0.001],    label: 'Üstten' },
  FRONT:      { dir: [0, 0.25, -1],    label: 'Önden' },
  BACK:       { dir: [0, 0.25, 1],     label: 'Arkadan' },
  SIDE_RIGHT: { dir: [1, 0.25, 0],     label: 'Sağ Yan' },
  SIDE_LEFT:  { dir: [-1, 0.25, 0],    label: 'Sol Yan' },
  ISO:        { dir: [0.55, 0.5, 0.9], label: 'İzometrik' },
},
```

**İhlal:** Standart bakış adları: kapı görünümü / karşı görünüm / sağ / sol / üst /
izometrik. `FRONT` ve `BACK` adları, "ön kapı" kavramı kaldırıldığı için yanıltıcı.
**Önemli not:** `dir` vektörlerinin **hepsi standartla uyumlu** — `ISO [0.55, 0.5, 0.9]`
tam olarak yeni referans kamera (`+z, +x, +y`), `BACK [0, 0.25, 1]` ise kapı görünümü.
Yalnızca adlar değişecek; H-02'deki `z` düzeltmesinden sonra anlamları da kendiliğinden
doğru olur.
**Fix:** `FRONT → OPPOSITE` ("Karşıdan"), `BACK → DOOR` ("Kapıdan"); `dir` değerlerine
dokunma.

---

### M-04 · X-Ray derinlik filtresi yanlış uçtan soyuyor — **MEDIUM**

**Dosya:** `apps/frontend/src/lib/utils/scene/sceneFilter.ts:13, 26` ·
tetikleyici: `CameraPresetButtons.tsx:58, 120-137`

```ts
 * 2. Layer filtresi: activeLayer > 0 ise, positionZ < activeLayer olan kutular ghost olur.
return box.positionZ < activeLayer;
```

**İhlal:** Küçük `z` = kapıya yakın varsayılıyor; standartta küçük `z` uzak yüzdür. Filtre
yükü ters uçtan soyuyor. Ayrıca arayüz etiketi "Derinlik Filtresi" — terim `length`
olmalı.
**Fix:** `positionZ > length − activeLayer`; etiketi "Uzunluk Filtresi" yap.

---

### M-05 · CoG panelinde yanlış eksen etiketi — **MEDIUM**

**Dosya:** `apps/frontend/src/features/planning/scene/components/CameraPresetButtons.tsx:214-221`

```tsx
<span>Sağ-Sol Yük Dağılımı</span>  {(balance.frontAxleShare * 100).toFixed(1)}%
<span>Ön-Arka Yük Dağılımı</span>  {(balance.rearAxleShare * 100).toFixed(1)}%
```

**İhlal:** `frontAxleShare` ve `rearAxleShare` **ikisi de `z` ekseni** paylarıdır ve
toplamları 1'dir. "Sağ-Sol" satırı `lateralBias`'i (x ekseni) göstermeli. Kullanıcı lateral
dengeyi hiç görmüyor; iki satır aynı büyüklüğün tümleyenini gösteriyor.
**Fix:** Sağ-Sol satırına `lateralBias`, Ön-Arka satırına `longitudinalBias` bağla. H-05
düzeltilmeden bu satırların yönü de ters kalır.

---

### M-06 · `+Z (kapı/ön)` adlandırması — **MEDIUM**

**Dosya:** `apps/frontend/src/features/planning/scene/components/CargoMeshInstanced.tsx:59-63`

```ts
const FACE_CONFIGS = [
  // +Z (kapı/ön)
  { ox: 0, oy: 0, oz: 1, rx: 0, ry: 0 },
  // -Z (arka)
  { ox: 0, oy: 0, oz: -1, rx: 0, ry: Math.PI },
```

**Durum:** `+Z = kapı` kısmı standarda **uygun**; `/ön` eki ve `-Z = arka` adlandırması
yanlış — standartta "ön/arka" kapı kavramı yok, `−Z` uzak yüzdür.
**Fix:** Yorumları `+Z → referans kapı (z = length)`, `−Z → uzak yüz (z = 0)` olarak yaz.

---

### M-07 · Etiket yüzü yorumu kod ile çelişiyor — **MEDIUM**

**Dosya:** `apps/frontend/src/features/planning/scene/components/BoxWrapper.tsx:24, 279`

```tsx
/** +Z yüzüne (kapıya bakan) uygulanacak etiket texture'ı */
// 6-material array: +X, -X, +Y, -Y, +Z(kapıya bakan), -Z(arka)
```

**Durum:** Standarda göre **doğru** (`z = length` referans kapıdır). Ancak aynı kod
tabanındaki `ContainerMesh` kapıyı `Z = 0`'a koyduğu için ürün etiketleri fiilen ters yüze
bakıyor.
**Fix:** H-02 düzeltilince bu dosya kendiliğinden doğru olur; yalnızca `-Z(arka)` ifadesi
`-Z (uzak yüz)` olarak güncellenir.

---

### M-08 · Squad dokümanları eski koordinat tablosunu taşıyor — **MEDIUM**

**Dosyalar:** `apps/frontend/src/features/planning/scene/CLAUDE.md:33` ·
`apps/frontend/.claude/CLAUDE.md` (3D Sahne → Koordinat Sistemi tablosu)

```
X=Genişlik · Y=Yükseklik · Z=Derinlik · Origin=Sol-Alt-Arka · Rotasyon=Derece
```

**İhlal:** `Z=Derinlik` → `length` olmalı; `Origin=Sol-Alt-Arka` → origin **uzak**-sol-alt
köşedir ("arka" ifadesi kapı ucunu çağrıştırıyor); `Depth / Length` eşanlamlı kullanımı
kaldırılmalı. ("Sol" kısmı artık **doğru**.)
**Fix:** Her iki dokümandaki tabloyu sil, `COORDINATE_STANDARD.md`'ye referans ver.

---

### M-09 · Tablolarda eksen/terim adları yanlış — **MEDIUM**

**Dosyalar:** `products/components/ProductTable.tsx:747, 753` (hücreler 273-289) ·
`imports/components/ERPItemsTable.tsx:468, 474` (hücreler 558-572) ·
`imports/components/BulkImportDialog.tsx:647, 649`

```tsx
<TableHead>Uzunluk/Çap (X)</TableHead>   // hücre: item.width
<TableHead>Derinlik (Z)</TableHead>      // hücre: item.length
```

**Durum:** Eksen eşlemesi **doğru** (`width → x`, `length → z`), adlandırma yanlış:
`width` "Uzunluk", `length` "Derinlik" diye gösteriliyor. Yeni terminolojide `x` =
**Genişlik/width**, `z` = **Uzunluk/length** — yani iki kolon adı da takas edilmiş.
**Fix:** `Genişlik (X)` / `Yükseklik (Y)` / `Uzunluk (Z)`.

---

### M-10 · Ürün formunda `depth` terimi — **MEDIUM**

**Dosya:** `apps/frontend/src/features/data-management/products/components/ProductForm.tsx:790-815`

```tsx
<DimensionField name="width"  label={`${t('forms.product.width')} (X)`} />
<DimensionField name="length" label={`${t('forms.product.depth')} (Z)`} />
```

**Durum:** Eksen eşlemesi **doğru** — bu dosya H-10'daki araç formunun aksine doğru
çalışıyor ve düzeltme için referans alınmalı. Tek sorun i18n anahtarı:
`forms.product.depth` → `forms.product.length`.
**Fix:** i18n anahtarını ve `tr.json` / `en.json` karşılıklarını değiştir.

---

### M-11 · Backend DTO'larında `Depth` — **MEDIUM**

**Dosyalar:** `…/Common/Models/OptimizationResult.cs:24` (`PlacedItemResult.Depth`) ·
`…/Shares/GetSharePlanByToken/SharePlanDto.cs:17` (`SharePlacementDetailDto.Depth`) ·
`…/Common/Optimization/VolumeScoring.cs:19-23` (`DepthCoefficient`, `DepthTerm`)

```csharp
public sealed record PlacedItemResult(
    Guid PlacementId, Guid ItemId,
    decimal X, decimal Y, decimal Z,
    decimal Width, decimal Height, decimal Depth, …);
```

**İhlal:** Standart terim `Length`. Dikkat: aynı dosyalarda `ShareVehicleDataDto.Length`
(SharePlanDto.cs:6) zaten `Length` kullanıyor — yani **tek API yanıtında araç için
`Length`, kutu için `Depth`** dolaşıyor.
**Fix:** `Depth → Length`; API sözleşmesi değiştiği için frontend tarafıyla (M-00) aynı
PR'da yapılmalı.

---

### M-12 · Gereksizleşen `length → depth` dönüşümü — **MEDIUM**

**Dosyalar:** `lib/api/loadingPlanMappers.ts:322-342, 367, 386, 687-706` ·
`lib/store/usePlanStore.ts:799`

```ts
function placedDimensions(w: number, h: number, l: number, rotation: number)
  : { pw: number; ph: number; pd: number } { … }
```

```ts
depth: item.length,
```

**İhlal:** M-00 + M-11 uygulandığında bu dönüşüm anlamsız kalır (`length → length`).
Ayrıca `w/h/l` ve `pw/ph/pd` kısaltmaları standardın yasakladığı biçimde.
**Fix:** İmzayı `placedDimensions(width, height, length, rotation) → { width, height, length }`
yap; `depth: item.length` satırı doğrudan `length: item.length`'e iner.

---

### M-13 · `bottom-left-rear` origin yorumları — **MEDIUM**

**Dosyalar:** `lib/utils/geometry/geometry.ts:6` ·
`lib/utils/geometry/calcCenterOfGravity.ts:49` ·
`lib/utils/geometry/checkOrientationFit.ts:27`

```ts
 * Positions are bottom-left-rear corners in centimeters (scene contract).
// Sol-alt-arka origin: kutunun bounds'u positionX..positionX+width gibi.
```

**Durum:** `bottom` ve **`left` artık doğru** (origin `x = 0`, yani kapı görünümünde sol).
Yanlış olan `rear`: köşe kapı ucunda değil, **uzak yüzdedir** (`z = 0`).
**Fix:** `bottom-left-far corner (min x, min y, min z)` — hesaplama mantığı doğru, yalnızca
adlandırma yanıltıcı.

---

### M-14 · Prototip HTML tamamen farklı bir konvansiyon kullanıyor — **MEDIUM**

**Dosya:** `tip1_animasyonlu_planlayici (1).html:425, 435, 464-470, 586, 643-646` (repo kökü)

```js
return { x: algX - CL/2, y: algZ - CH/2, z: CW/2 - algY };   // toScene()
const onLbl = makeTextSprite('ÖN (KAPI)', …); onLbl.position.set(CL/2 + 40, 0, 0);
```

**Kullanılan konvansiyon:** `U(zunluk) → x`, `G(enişlik) → −z`, `Y → y`; origin konteyner
**merkezinde**; kapı `+X` ucunda ve **"ÖN (KAPI)"** etiketli.
**İhlal:** Merkezi origin, eksen eşlemesinin tamamen farklı olması ve "ön = kapı"
adlandırması. Üretimde kullanılmıyor; ancak veri giriş formlarındaki `Uzunluk (X)`
etiketleri (H-10, M-09) buradan miras alınmış görünüyor.
**Fix:** `docs/archive/` altına taşı, başına "prototip — koordinat konvansiyonu geçersiz"
uyarısı ekle.

---

### L-01 · Excel çıktısında eksen/origin açıklaması yok — **LOW**

**Dosya:** `lib/utils/export/export-utils.ts:214-244`

```ts
'Derinlik (cm)': p.depth,
'Konum X': p.positionX, 'Konum Y': p.positionY, 'Konum Z': p.positionZ,
```

**İhlal:** `Derinlik` → `Uzunluk`; ayrıca hangi köşe / hangi yön olduğu yazmıyor. Depo
operatörü `Konum Z = 0` değerini kapı sanabilir.
**Fix:** Başlıkları düzelt ve sayfaya açıklama satırı ekle: `X = width (kapıdan bakışta
sağa), Y = height, Z = length (uzak yüz → kapı), köşe = origin'e en yakın köşe, cm`.

---

### L-02 · Sahne HUD'unda eksen bağlamı yok — **LOW**

**Dosya:** `features/planning/scene/components/SelectedBoxCoords.tsx:20-33`
**İhlal:** Yalnızca `X / Y / Z` harfleri; boyut adı ve referans köşe gösterilmiyor.
**Fix:** `X width · Y height · Z length — kutunun origin'e en yakın köşesi` alt satırı.

---

### L-03 · Staging alanı yönü belgelenmemiş — **LOW**

**Dosya:** `lib/store/usePlanStore.ts:189-191`

```ts
const originX = vehicleWidth + SCENE.STAGING_GAP_CM;
```

**İhlal:** Doğrudan ihlal değil; `+x` yönü standartta kapı görünümünde **sağ** taraftır ama
kod bunu yalnızca "yan" diye anıyor.
**Fix:** Sabitlerin yanına yön yorumu: `staging alanı sağ tarafta, x > width`.

---

### L-04 · Orientation etiketleri ve `RotatedDimensions.depth` — **LOW**

**Dosya:** `lib/utils/geometry/boxOrientations.ts:18-23, 63-88`

```ts
{ idx: 2, label: 'Ön yüz altta', … }, { idx: 4, label: 'Sol yüz altta', … },
export interface RotatedDimensions { width: number; height: number; depth: number; }
```

**İhlal:** `depth` → `length` (M-00 kapsamı). Ayrıca `Ön/Arka/Sol/Sağ yüz` etiketleri
konteyner yüz adlarıyla karışıyor; standart bu kelimeleri kapı/kamera için ayırıyor.
**Fix:** Etiketleri eksene bağla (`+z yüzü altta` …).

---

### L-05 · Placement orientation yorumu — **LOW**

**Dosya:** `lib/types/loadingPlan.ts:4-5`

```ts
// 0: alt yüz · 1: üst yüz · 2: ön yüz · 3: arka yüz · 4: sol yüz · 5: sağ yüz altta.
```

**İhlal:** L-04 ile aynı; ayrıca tip dosyası API sözleşmesi olduğu için İngilizce olmalı.
**Fix:** `bottom / top / +z / −z / −x / +x face down`.

---

### L-06 · `calcVolume` parametre adları — **LOW**

**Dosya:** `lib/utils/geometry/calcVolume.ts:7-9`

```ts
export function calcVolume(lengthCm: number, widthCm: number, heightCm: number): number
```

**İhlal:** Çağrı yerlerinde sıra tutarsız (`ProductTable.tsx:235` `(length, width, height)`,
`VehicleDimensionsFields.tsx:31` `(length, width, height)`). Çarpım sırası sonucu
değiştirmediği için hata üretmiyor, isimlendirme yine de standarda aykırı.
**Fix:** `calcVolume(widthCm, heightCm, lengthCm)`.

---

### L-07 · Toplu içe aktarma başlıkları — **LOW**

**Dosyalar:** `imports/components/VehicleBulkImportDialog.tsx:135, 379` ·
`imports/components/BulkImportDialog.tsx:189, 647-649`

```ts
length: String(r['Uzunluk (cm)'] ?? ''),
```

**İhlal:** Şablon başlıkları eksen bilgisi taşımıyor ve M-09'daki takas aynı burada da var.
**Fix:** `Uzunluk (Z, cm)` / `Genişlik (X, cm)` / `Yükseklik (Y, cm)`; eski başlıkları
geriye dönük kabul etmeye devam et.

---

### L-08 · `w/h/d` kısaltmaları — **LOW**

**Dosya:** `lib/utils/geometry/checkOrientationFit.ts:8-25`

```ts
export function fitsInVehicle(posX, posY, posZ, w: number, h: number, d: number, vehicle: Vehicle)
```

**İhlal:** Standart açık eşleme olmadan `w/h/d/l` kısaltmalarını yasaklıyor.
**Fix:** `width, height, length` tam adları.

---

## 3. Standarda uygun dosyalar

| Dosya | Not |
| ----- | --- |
| `lib/utils/geometry/geometry.ts` (`boxesIntersect`, `computeViolations`) | AABB testi eksen-agnostik ve doğru; yalnızca origin yorumu (M-13). |
| `features/planning/scene/components/BoxWrapper.tsx` (pivot offset, 100-175) | `+boyut/2` köşe→merkez dönüşümü doğru ve tek noktada. |
| `features/planning/scene/components/CargoMeshInstanced.tsx` (matris kurulumu 186-190, 497-505) | Offset kuralı `InstancedMesh` yolunda da tutarlı. |
| `features/data-management/products/components/ProductForm.tsx:790-815` | Eksen eşlemesi doğru — H-10 düzeltmesinin referansı (yalnızca i18n anahtarı, M-10). |
| `features/planning/scene/utils/cameraUtils.ts` · `ResourceTracker.ts` | Konvansiyondan bağımsız. |
| `lib/utils/scene/buildBoxLabel.ts` · `buildAtlasTexture.ts` | Eksen varsayımı yok. |
| `features/planning/scene/components/ContainerBody.tsx:45` | `[width/2, height/2, length/2]` merkezleme doğru; terim de artık doğru. |
| `apps/backend/…/Optimization/PlacementValidator.cs:22-28` (`Intersects`) | AABB mantığı doğru; yalnızca parametre adları (L-08 muadili). |
| `apps/backend/…/Entities/LoadingPlanPlacement.cs` | `PositionX/Y/Z` adlandırması standartla uyumlu. |
| `lib/utils/scene/loadOrder.ts:38-52` (`side` / `top` dalları) | `z` yönünden bağımsız; `x`/`y` sıralaması standartla çelişmiyor. |

---

## 4. Artık uyumlu — dokunulmayacak

Aşağıdaki maddeler **sürüm 1 denetiminde ihlal** olarak raporlanmıştı; yeni standartla
birlikte **doğru** hâle geldiler. Düzeltmeye başlamadan önce bu listeyi okuyun.

| Konu | Dosya | Neden artık doğru |
| ---- | ----- | ----------------- |
| **`+X = sağ`, `−X = sol`** | `CargoMeshInstanced.tsx:64-67` | Standart artık right-handed; kapı görünümünde `+x` sağdır. Three.js varsayılanı doğrudan geçerli. |
| **Aynalama yapılmaması** | tüm sahne | Standart right-handed olduğu için `scale.x = -1` benzeri bir telafi **gerekmiyor** — eklenmemesi doğru. |
| **`length` alan adı** | `vehicle.ts:36` · `item.ts:19` · `Item.cs:14` · `Vehicle.cs:13` · `OptimizationInput.VehicleLength` | `depth` yerine `length` standart terim oldu. Bu alanlar **zaten doğru**; yeniden adlandırılmayacak. |
| **`doorSide: 'right'` → `x = width`** | `ContainerMesh.tsx:306` · `VehiclePreview3D.tsx:350` | Yön eşlemesi standartla birebir; yalnızca alan adı `face`'e dönecek (M-02). |
| **`ISO` kamera yönü** | `scene-config.ts:111` — `dir: [0.55, 0.5, 0.9]` | `+x, +y, +z` = yeni referans izometrik kamera (kapı + sağ + üst). Değer değişmeyecek. |
| **`BACK` kamera yönü** | `scene-config.ts:108` — `dir: [0, 0.25, 1]` | `+z` tarafı = kapı görünümü. Yalnızca ad değişecek (M-03). |
| **Origin'in "sol" olması** | `geometry.ts:6` · `calcCenterOfGravity.ts:49` | Origin `x = 0`'da, yani kapı görünümünde solda. Yorumun "left" kısmı doğru; yanlış olan "rear" (M-13). |

---

## 5. Beklemedeki konulara bağlı bulgular

Aşağıdaki üç konu netleşmeden ilgili kod değiştirilmeyecek:

| Konu | Etkilediği bulgu | Durum |
| ---- | ---------------- | ----- |
| `x₀` — big door açıklık payı | **H-09** (motor), yerleştirme sınırları | Değer ve `x = width` tarafı onayı bekliyor |
| Üst kapı (top door) | **H-07** (`LoadingType.Top`, `DoorDirection.Top`), `ContainerMesh` `TopDoor` bileşeni, `loadOrder` `top` dalı | Sektör araştırması |
| Small door'u olmayan konteyner | **H-07** (origin kuralının hangi yüzden türetileceği) | Sektör araştırması |

---

## 6. Önerilen uygulama sırası

1. **Kapı modeli** (H-07, M-01, M-02) — diğer her şeyin bağlı olduğu sözleşme. `top` ve
   small-door'suz konteyner konuları hariç tutularak başlanabilir.
2. **`z` ekseninin çevrilmesi** (H-01 → H-06, M-04, M-05) — tek bir PR'da, golden-master
   testleriyle birlikte. Parça parça yapılırsa backend ve frontend geçici olarak ters
   çalışır.
3. **Terminoloji** (M-00, M-11, M-12, L-01, L-04…L-08) — davranış değişikliği olmayan
   mekanik rename; ayrı PR.
4. **Arayüz etiketleri** (H-10, M-09, M-10, L-02) — kullanıcıya görünen kısım.
5. **Dokümanlar** (M-08, M-14).
6. **`x₀`** (H-09) — değer tanımlandıktan sonra.
