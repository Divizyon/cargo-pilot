# Koordinat Standardı Uyum Denetimi — Nihai Rapor

**Tarih:** 2026-08-15
**Kapsam:** Backend (optimizasyon motoru, sözleşmeler, migrations, ERP), Frontend (tip/API/store, 3D sahne, geometri, UI/form), dokümantasyon ve testler — 7 alan, ayrı ajanlarca doğrulanmış tarama.
**Referans standart:** `docs/COORDINATE_STANDARD.md` (projenin tek yetkili koordinat sistemi tanımı). Çelişki hâlinde bu belge kazanır.
**Not:** Bu belge bir denetim raporudur; yazıldığı turda kaynak kod değiştirilmemişti.

> **Uygulama durumu (2026-08-15):** Bulguların bir kısmı bu tarihten sonra düzeltildi.
> **Kapatıldı:** KN-1 (z ekseni yönü — LIFO bölgeleri, dingil yükü, yükleme sırası,
> animasyon, kapı/kabin konumu), KN-3 (terminoloji: `depth` → `length`, `w/h/d/l`),
> KN-5 (birim: `Vehicle.Volume` böleni, demo seed), UI etiketleri (M-45…M-64).
> **Güncelleme (2026-08-16):** KN-2 (kapı modeli) de kapandı — `doors` listesi,
> `VehicleDoors` tablosu ve top door uygulandı; `x₀`/açıklık payı kavramı
> standarttan kaldırıldı. Bu belgedeki "açık" işaretleri 2026-08-15 ölçümünü
> yansıtır; güncel durum için `docs/KOORDINAT-BRANCH-DENETIMI-2026-08-16.md` ve
> `docs/KOORDINAT-DUZELTME-PLANI.md`. Aşağıdaki tüm bulgular ayrı doğrulama ajanları tarafından dosya:satır düzeyinde kanıt alıntısıyla teyit edilmiştir.

---

## 0. Uygulama durumu — 2026-08-15 ikinci ölçüm (rapor sonrası)

> Bu rapor **denetim anının** fotoğrafıdır ve içeriği değiştirilmemiştir. Rapor yazıldıktan
> sonra `dev`'e giren PR **#997** (Z ekseni yönü) ve **#1004** (bekleyen kararlar) bulguların
> bir kısmını kapattı. Aşağıdaki durum, `dev` @ `96e9fd8b` üzerinde `grep`/dosya okumasıyla
> tek tek doğrulanmıştır; **dosya:satır numaraları o PR'lardan sonra kaymıştır.**

| Bulgu | Durum (2026-08-15, `dev` @ `96e9fd8b`) | Kanıt |
|---|---|---|
| H-01, H-02 | ✅ **kapandı** — bölge ataması ters çevrildi | `LifoPlacement.cs:82` → `zones[orders[i]] = (length-(i+1)*zoneSize, length-i*zoneSize)`; `:44-53` yorumu "referans kapı z = length" diyor |
| H-03, H-19, H-20, H-21 | ✅ **kapandı** — test sözleşmeleri ve assert yönleri çevrildi | `LifoGoldenMasterTests.cs:10-11`; `GroupZoneTests.cs:29` `Assert.True(zByOrder[1] > zByOrder[2], …)`; `ModulBayraklariTests.cs:129` `disabled.Max(Z) < enabled.Max(Z)` |
| H-09, H-13, H-15 | ✅ **kapandı** — `buildLoadOrder` artık daima Z artan sıralıyor | `loadOrder.ts:49-56` `default:` dalı; `loadOrder.test.ts:52` `expect(order).toEqual([1, 0])` |
| H-10, H-14 | ✅ **kapandı** | `useLoadingAnimation.ts:129` `fromZ = length + OFFSET` |
| H-16 | ✅ **kapandı** | `calcCenterOfGravity.ts:129` `frontAxleShare = 1 - cog.z / containerLength` |
| H-11, H-12, H-17, H-18 | ✅ **kapandı** (sahne/UI tarafı) | `ContainerMesh.tsx:336` ve `VehiclePreview3D.tsx:281` yorumları `z = 0` uzak yüz sözleşmesine göre yeniden yazıldı; `CameraPresetButtons.tsx:217` lateral denge ayrımını anlatıyor |
| H-04 … H-08 | ✅ **kapandı** (2026-08-16) | `vehicle.ts` artık `DoorType`/`DoorFace` tanımlıyor; `doors: [{type, face}]` listesi backend, API ve arayüzde canlı. `clearanceCm` standarttan kaldırıldı |
| H-22, H-23, H-24 | ⚠️ **açık** — prototip HTML, üretim dışı, öncelik düşük | değişmedi |
| M-/L- bulguları | ⏸ **bu turda yeniden taranmadı** — durumları doğrulanamadı, tabloları olduğu gibi bırakıldı | — |

**`depth` terimi:** boyut anlamında kaldırıldı. `grep -rn -i depth apps/frontend/src` (2026-08-15)
çıktısındaki 29 isabetin tamamı Three.js malzeme özelliği (`depthWrite`/`depthTest`),
`scene-config.ts:95` `STAGING_DEPTH_CM` sabiti veya `usePlanStore.ts` yerel değişkenidir
(`rowDepth`, `rowMaxDepth`). Backend'de `PlacedBox.cs` `Width, Height, Length` taşıyor;
kalan tek isabet `NetsisProductFetcher.cs`'teki yerel `depth` değişkenidir ve hedef alanı `Length`.

---

## 1. Özet

- Ham bulgu: 199 → doğrulama sonrası kalan: **189**
- Aynı dosya:satır konumunu birden fazla ajan farklı severity ile işaretlediği 12 durumda kayıtlar birleştirilmiş (en yüksek severity esas alınmıştır) → **177 tekil dosya:satır konumu**.
- Aşağıdaki tüm tablolar ve bulgu kodları (H-/M-/L-) bu 177 tekil konum üzerinden verilmiştir.

### 1.1 Severity dağılımı (tekil konumlar, n=177)

| Severity | Adet | Oran |
|---|---:|---:|
| High | 24 | %13.6 |
| Medium | 101 | %57.1 |
| Low | 52 | %29.4 |
| **Toplam** | **177** | %100 |

Bunlardan **20 bulgu** bekleyen bir karara bağlı olduğu için **blocked** işaretlidir (bkz. Bölüm 5).

### 1.2 Alan bazında dağılım (ham 189 bulgu, bir konum iki alanda raporlanmışsa iki kez sayılmıştır)

| Alan | Bulgu | Açıklama |
|---|---:|---|
| dokuman-test | 46 | Testler, arşiv/güncel dokümanlar, prototip HTML dosyaları |
| frontend-ui-form | 34 | Araç/ürün formları, tablo başlıkları, locale metinleri, import/export |
| backend-sozlesme | 26 | Backend API/DTO/migration/entity sözleşmeleri |
| backend-optimization | 24 | Optimizasyon motoru (LifoPlacement, OptimizationEngine, scoring, validator) |
| frontend-tip-api-store | 24 | Zod şemaları, mapper'lar, Zustand store |
| frontend-3d-sahne | 25 | R3F sahne bileşenleri, kamera, animasyon, config |
| frontend-geometri | 10 | Geometri/CoG/fit yardımcı fonksiyonları, export |

### 1.3 Kategori dağılımı (tekil konumlar, çoklu etiketli konumlar birden çok kategoride sayılır)

| Kategori | Adet |
|---|---:|
| terminoloji (`depth`/`derinlik`, `w/h/d/l` kısaltmaları) | 59 |
| kapi-modeli (front/rear/side/top tekil enum, doorSide) | 51 |
| z-yonu (kapı z=0 sanılması, ters sıralama) | 23 |
| dokuman (yanlış sözleşme özeti) | 11 |
| ui-etiket | 8 |
| eksen-eslemesi (length=X, width=Z gibi ters eşleme) | 8 |
| origin (origin'in "arka/kapı" köşesi sanılması) | 7 |
| birim (mm/m ↔ cm karışıklığı) | 6 |
| kamera | 4 |
| aynalama (gizli telafi dönüşümü) | 2 |

### 1.4 Dosya bazında yoğunluk (en çok bulgu içeren 10 dosya)

| Dosya | Bulgu sayısı |
|---|---:|
| `apps/backend/CargoPilot.Application/Common/Optimization/OptimizationEngine.cs` | 9 |
| `apps/frontend/src/locales/tr.json` | 6 |
| `tip1_animasyonlu_planlayici (1).html` | 6 |
| `apps/backend/CargoPilot.Application/Common/Optimization/LifoPlacement.cs` | 5 |
| `apps/frontend/src/lib/store/usePlanStore.ts` | 5 |
| `apps/frontend/src/features/data-management/vehicles/components/VehiclePreview3D.tsx` | 5 |
| `ALGORITMA.html` | 5 |
| `apps/frontend/src/lib/types/vehicle.ts` | 4 |
| `apps/frontend/src/lib/api/vehicleMappers.ts` | 4 |
| `apps/frontend/src/lib/utils/scene/loadOrder.ts` | 4 |

---

## 2. Kök nedenler

Bulguların büyük çoğunluğu 5 tekrarlayan kök nedene indirgenebilir. Terminoloji ve UI etiket sorunları genelde kapı-modeli/z-yönü hatalarının yüzeydeki yansımasıdır.

### KN-1 — Z ekseni yönü ters varsayımı ("kapı z=0'dadır")
Standart: z=0 **uzak yüzdür**, referans kapı **z=length**'tedir; yükleme z=0'dan başlar, kapıya doğru (z→length) ilerler. Kod tabanının önemli bir kısmı bunun tersini varsayıyor: "arka kapı Z=0'dadır" yorumları, LIFO bölge ataması, yükleme animasyonu giriş noktası, dingil payı hesabı ve ilgili testler hep aynı ters yönü kilitliyor.
Etkilenen: H-01, H-02, H-03, H-09, H-10, H-11, H-13, H-14, H-15, H-16, H-19, H-20, H-21 ve M-02, M-06, M-08, M-33, M-70, L-07, L-42 (bkz. Bölüm 4).

### KN-2 — Kapı modeli: tekil yön enum'u yerine `doors:[{type,face}]` listesi yok
Standart §4: kapılar `small`/`big` tipinde, konumu yüz değeriyle (`z=0`, `z=length`, `x=0`, `x=width`) verilen bir **liste**dir. Kod tabanı hâlâ `LoadingType {Rear, SideRight, SideLeft, SideBoth, Top}` / `DoorDirection {front, rear, side, top, rearAndSide}` + ayrı `doorSide: right|left` tekil alan modelini kullanıyor. Bu model bir araçta aynı anda small + iki big door bulunmasını temsil edemiyor, "ön kapı" gibi standartta olmayan kavramlar üretiyor ve mapping sırasında sessiz veri kaybına (SideBoth → SideRight, rearAndSide → Rear) yol açıyor.
Etkilenen: H-04, H-05, H-06, H-07, H-08, H-17(kısmen), H-24 ve kapi-modeli kategorisindeki 51 bulgunun tamamı.

### KN-3 — Terminoloji: `depth`/`derinlik` ve `w/h/d/l` kısaltmaları
Standart terim kuralı z boyutu için yalnızca `length` (TR: "Uzunluk") kullanılmasını, `depth`/`derinlik` ve tek harfli kısaltmaların (`w`,`h`,`d`,`l`) tamamen kaldırılmasını şart koşuyor. Bu terim backend motorunun veri modelinden (`PlacedBox.D`, `OptimizationResult.Depth`), frontend tip sözleşmelerine (`PlacementWithDimensions.depth`, `CogInput.depth`), UI etiketlerine (`tr.json` "Derinlik") ve testlere kadar tüm katmanlara sızmış.
Etkilenen: terminoloji kategorisindeki 59 bulgunun tamamı.

### KN-4 — Origin/eksen eşlemesi ve gizli aynalama
Standart §2/§3/§8: origin uzak-sol-alt köşededir (min x,y,z), x=width, y=height, z=length ve sistem right-handed olduğu için hiçbir aynalama/telafi dönüşümü gerekmez. Arşiv dokümanları ve eski prototip (`tip1_animasyonlu_planlayici (1).html`) origin'i merkeze alıp bir ekseni negatif katsayıyla ters çeviriyor; `length` alanı X eksenine, `height` ise Z eksenine eşleniyor; UI'da "Uzunluk/Çap (X)" ve "Derinlik (Z)" gibi ters etiketler bunu kullanıcıya kadar taşıyor.
Etkilenen: H-22, H-23, M-73(eksen-eslemesi grubu), origin+eksen-eslemesi+aynalama kategorilerindeki 17 bulgu.

### KN-5 — Birim tutarsızlığı (mm/m ↔ cm)
Standart §8: tek birim cm'dir, dönüşüm yalnızca API sınırında yapılır. `Vehicle.Volume` hesaplanan kolonu ve demo seed verisi mm/gram ölçeğinde kurulmuş (cm³→m³ bölen 1e9 yerine 1e6 olmalı); frontend tarafında `interiorWidthM/HeightM/DepthM` gibi alan adları metre ima ediyor ama içeriği cm.
Etkilenen: birim kategorisindeki 6 bulgu (M-11, M-12, M-13, M-63, L-08).

---

## 3. Yüksek öncelikli bulgular (H-01 … H-24)

Tümü doğrulanmış, blocked değil — yani bekleyen bir karara bağlı olmadan düzeltilebilir.

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| H-01 | `CargoPilot.Application/Common/Optimization/LifoPlacement.cs:70` | z-yonu | LIFO bölgeleri ters yöne dağıtılıyor: `zones[orders[i]] = (i*zoneSize, (i+1)*zoneSize)` ile UnloadingOrder=1 (ilk inecek) en küçük Z bölgesine, yani kapıdan (z=length) en uzağa düşüyor. **Fix:** bölge ataması ters çevrilmeli — ilk inecek grup z=length ucuna, son inecek grup z=0'a. Golden-master snapshot'ları yenilenmeli. |
| H-02 | `LifoPlacement.cs:36` | z-yonu | Yorum "Arka kapı Z=0'dadır… kapıya en yakın (en küçük Z)" diyor; standartta z=0 uzak yüz, kapı z=length. Bu yorum H-01'in kök gerekçesi. **Fix:** yorumu ve mantığı standarda göre yeniden yaz. |
| H-03 | `CargoPilot.Engine.Tests/LifoGoldenMasterTests.cs:10` | z-yonu, dokuman | Golden master sınıf özeti "arka kapı Z=0, araç önü Z=Length" sözleşmesini kilitliyor; snapshot'lar ve test adları (`Lifo_..._ArkaKapi_...`) bu ters yönü regresyon olarak koruyor. **Fix:** özeti düzelt, H-01 sonrası snapshot'ları yeniden onayla. |
| H-04 | `CargoPilot.Infrastructure/Persistence/Repositories/ShareLinkRepository.cs:175` | kapi-modeli | `MapDoorDirection` SideRight/SideLeft'i aynı `"side"` değerine indirgiyor; public share DTO'sunda big door'un x=0 mı x=width mi olduğu kayboluyor. **Fix:** `doors:[{type,face}]` listesine geç. |
| H-05 | `apps/frontend/src/lib/types/vehicle.ts:11` | kapi-modeli | `DoorDirection = front|rear|side|top|rearAndSide` — standartta olmayan enum modeli. **Fix:** `doors: [{type,face}]` listesi. |
| H-06 | `vehicle.ts:43` | kapi-modeli | Araç zod şeması `doorDirection` + `doorSide` tekil alanlarına dayanıyor; çoklu kapı (small + 2×big) temsil edilemiyor. **Fix:** şemayı `doors` dizisine taşı. |
| H-07 | `apps/frontend/src/lib/api/useVehicles.ts:341` | kapi-modeli | Arşiv/silme (`useDeleteVehicle`) payload'ında `doorSide` taşınmıyor; `buildCreateVehiclePayload` varsayılan `SideRight`e düşüyor — x=0 big door'lu araç arşivlenince x=width'e kayıyor. **Fix:** payload'a `doorSide` ekle. |
| H-08 | `useVehicles.ts:370` | kapi-modeli | `useArchiveVehicle` aynı `doorSide` kaybını tekrarlıyor. **Fix:** H-07 ile birlikte düzelt. |
| H-09 | `apps/frontend/src/lib/utils/scene/loadOrder.ts:32` | z-yonu | `'rear'` dalı kapıyı Z=0 kabul edip Z'yi azalan sıralıyor — kutular kapıya en yakından yükleniyor (standart z=0'dan başlamalı). **Fix:** kapı yönünden bağımsız daima z artan sıralama; `doors` listesinden okunmalı. |
| H-10 | `apps/frontend/src/features/planning/scene/hooks/useLoadingAnimation.ts:123` | z-yonu | `'rear'` animasyon dalında `fromZ = -OFFSET`; kutular kapı olmayan z=0 yüzünün dışından giriyor. **Fix:** `fromZ = length + ANIM_DOOR_OFFSET_CM`. |
| H-11 | `apps/frontend/src/features/planning/scene/components/ContainerMesh.tsx:320` | z-yonu | `'rear'` kapı meshi `position=[0,0,0]` ile z=0 yüzüne çiziliyor; referans kapı z=length'te olmalı. **Fix:** `doors` listesinden sürülen render'a geç. |
| H-12 | `apps/frontend/src/features/planning/scene/components/CameraPresetButtons.tsx:215` | eksen-eslemesi | "Sağ-Sol Yük Dağılımı" etiketi `frontAxleShare` (z/length tabanlı) değerini gösteriyor; standartta sağ/sol yalnızca x eksenidir. **Fix:** ayrı x-tabanlı lateral oran hesapla; Ön-Arka satırı z tabanlı kalsın. |
| H-13 | `loadOrder.ts:54` | z-yonu | `'rearAndSide'` dalı da z'yi azalan sıralıyor. **Fix:** H-09 ile birlikte. |
| H-14 | `useLoadingAnimation.ts:129` | z-yonu | `'rearAndSide'` animasyonu da `fromZ = -OFFSET`. **Fix:** H-10 ile birlikte. |
| H-15 | `apps/frontend/src/lib/utils/scene/loadOrder.test.ts:48` | z-yonu | Test, z=0'ı "kapıya yakın" kabul edip azalan Z sırasını (`[1,0]`) doğru olarak kilitliyor — regresyon koruması ters yönü sabitliyor. **Fix:** H-09 sonrası testi artan sıraya çevir. |
| H-16 | `apps/frontend/src/lib/utils/geometry/calcCenterOfGravity.ts:119` | z-yonu | `frontAxleShare = cog.z/containerLength` — "z=0 rear, z=length front" varsayımı standardın tersi (z=0 kabin ucu/ön, z=length referans kapı/arka). Dingil yükü raporu ve H-12'deki UI etiketi bu hatadan besleniyor. **Fix:** `frontAxleShare = 1 - cog.z/containerLength`; yön testi ekle. |
| H-17 | `apps/frontend/src/features/data-management/vehicles/components/VehiclePreview3D.tsx:361` | z-yonu | "Arka kapı — Z=0 yüzü" paneli z=0'a çiziliyor; referans kapı z=length'te olmalı. **Fix:** paneli z=length'e taşı. |
| H-18 | `VehiclePreview3D.tsx:495` | z-yonu | TIR kabini/king pimi/ön dingil `z > length` tarafına konumlanıyor; standartta kabin ucu z=0 olmalı — sahne z ekseninde tamamen ters. **Fix:** kabin geometrisini negatif z tarafına kaydır. |
| H-19 | `apps/backend/CargoPilot.Infrastructure.Tests/GroupZoneTests.cs:9` | z-yonu | Sınıf sözleşmesi "arka kapı Z=0" diyor. **Fix:** H-01/H-02 ile birlikte düzelt. |
| H-20 | `GroupZoneTests.cs:29` | z-yonu | `Assert.True(zByOrder[1] < zByOrder[2], ...)` — ilk inecek grubun küçük Z'de olmasını doğru kabul ediyor; standarda göre kapıya yakınlık büyük Z demektir. **Fix:** karşılaştırmaları ters çevir. |
| H-21 | `apps/backend/CargoPilot.Engine.Tests/ModulBayraklariTests.cs:126` | z-yonu | "Yük kapıya yaklaştı" iddiası `Max(Z)`'nin küçülmesiyle doğrulanıyor; kapı z=length olduğu için yaklaşmak Z'nin artması demektir. **Fix:** assert yönünü çevir. |
| H-22 | `tip1_animasyonlu_planlayici (1).html:311` | eksen-eslemesi | Prototipte `x=length(CL)`, `y=width(CW)`, `z=height(CH)` — hem length=X hem z-up ihlali. **Fix:** standart eksenlere göre yeniden kur (prototip dosyası, düşük öncelik). |
| H-23 | `tip1_animasyonlu_planlayici (1).html:425` | aynalama | `toScene()` origin'i merkeze taşıyor (`±boyut/2`) ve `CW/2 - algY` ile bir ekseni aynalıyor — right-handed sistemde hiçbir aynalama gerekmez. **Fix:** doğrudan `position=[x,y,z]` + pivot offset kullan. |
| H-24 | `tip1_animasyonlu_planlayici (1).html:454` | kapi-modeli | Kapı düzlemi `x = CL/2` yüzüne konuyor; small door width×height yüzünde ve referans kapı z=length'te olmalı. **Fix:** kapıyı z=length yüzüne taşı. |

> **Not:** H-22/H-23/H-24, `tip1_animasyonlu_planlayici (1).html` adlı bağımsız bir prototip/demo dosyasındadır, üretim kod tabanının parçası değildir; düzeltme önceliği düşüktür ama standardı örnekleyen bir referans olarak kullanılıyorsa aynı hatalar tekrar üretilebilir.

---

## 4. Orta öncelikli bulgular (M-01 … M-101, blocked olmayanlar)

Tekrar ve hacim nedeniyle alan bazında kompakt tablo olarak listelenmiştir; her satır dosya:satır, kategori ve tek cümlelik özet içerir. Ayrıntılı kanıt/düzeltme metni orijinal denetim kayıtlarında mevcuttur.

### 4.1 Backend — Optimizasyon motoru (backend-optimization / backend-sozlesme)

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| M-01 | `OptimizationResult.cs:24` | terminoloji | `PlacedItemResult.Depth` alanı — sözleşme adı `Length` olmalı; girdi tarafı zaten `Length` kullanıyor. |
| M-02 | `ItemOrdering.cs:21` (ve `:20`) | z-yonu | Grup sıralama yorumu "kapıdan en uzak bölge = arka kapıda Z=length tarafı" diyor; standartta en uzak bölge z=0'dır. |
| M-03 | `OptimizationEngine.cs:53` | z-yonu | Bölge tohumlama yorumu "Z=0'a, yani kapının önüne" diyor; z=0 kapı değil uzak yüzdür (davranış doğru, yorum ters). |
| M-04 | `OptimizationEngine.cs:88` | terminoloji | Sıcak döngüde `(w,h,d,rotation)` — `d` doğrudan `VehicleLength` ile karşılaştırılıyor, ad eksenle çelişiyor. |
| M-05 | `PlacedBox.cs:8` | terminoloji | `W,H,D` kısaltmaları motorun ana veri modelinde; `Width,Height,Length` olmalı. |
| M-06 | `PlacementValidator.cs:38` (ve 24,63,95,123,150,191) | terminoloji | Tüm kısıt fonksiyonlarında `w,h,d` parametre adları tekrarlanıyor. |
| M-07 | `VolumeScoring.cs:19` | terminoloji | `DepthCoefficient`/`DepthTerm` adları; XML özetinde "derinlik". |
| M-08 | `VolumeScoring.cs:21` | z-yonu | "küçük Z (kapıya yakın)" gerekçesi ters (davranış doğru, dokümantasyon yanlış). |
| M-09 | `Golden/SnapshotPayload.cs:90` | terminoloji | Snapshot şemasında `Depth` alanı; motor sözleşmesindeki hatayı kalıcılaştırıyor. |
| M-10 | `Shares/GetSharePlanByToken/SharePlanDto.cs:17` | terminoloji | `SharePlacementDetailDto.Depth` — public share sözleşmesinde yanlış terim. |
| M-11 | `Persistence/Configurations/VehicleConfiguration.cs:141` | birim | `Vehicle.Volume` hesaplanan kolonu 1e9'a bölüyor (mm³→m³); ölçüler cm olduğu için doğru bölen 1e6, hacim 1000× küçük çıkıyor. |
| M-12 | `Migrations/20260427200432_AddVehicleModel.cs:47` | birim | Aynı 1e9 bölen migration'da da sabitlenmiş. |
| M-13 | `Migrations/20260503160754_SeedLoadingPlanDemoData.cs:60` | birim | Demo seed verisi (2450×2700×13600, kapasite 24000000) mm/gram ölçeğinde; cm sahnede 10× büyük araç üretiyor. |
| M-14 | `docs/erp-integration/erp-schema-divizyon.md:143` | dokuman | ERP şeması `BOY` kolonunu var olmayan `Item.Depth`'e eşliyor (gerçek alan `Item.Length`). |

### 4.2 Backend — Kapı modeli sözleşmeleri (blocked olmayanlar bölüm 5'te, burada yalnızca terim/dokümantasyon türü)

*(Kapı modeli ile ilgili çoğu backend bulgusu bekleyen kararlara bağlı olduğu için Bölüm 5'te listelenmiştir.)*

### 4.3 Frontend — Tip/API/Store (frontend-tip-api-store)

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| M-15 | `lib/types/vehicle.ts:44` | kapi-modeli | `doorSide: 'right'\|'left'` — sağ/sol kapı kavramı yok, `x=0`/`x=width` yüz değeri olmalı. |
| M-16 | `lib/types/loadingPlan.ts:29` | terminoloji | `placementWithDimensionsSchema.depth` — tüm sahne/store zincirine yayılan kök alan. |
| M-17 | `loadingPlan.ts:96` | birim | `interiorWidthM/HeightM/DepthM` — hem `depth` hem yanıltıcı metre eki (içerik cm). |
| M-18 | `loadingPlan.ts:100` | kapi-modeli | Plan liste şemasında da front/rear/side/top enum'u + doorSide tekrarı. |
| M-19 | `lib/types/share.ts:60` | terminoloji | Public share placement şemasında `depth`. |
| M-20 | `share.ts:46` | kapi-modeli | Paylaşım araç verisinde `doorDirection: z.string()` — tipsiz, listesiz. |
| M-21 | `lib/api/vehicleMappers.ts:189` | kapi-modeli | Bilinmeyen loadingType için `DoorDirection.Front` varsayılanı — standartta "front door" yok. |
| M-22 | `vehicleMappers.ts:253` | kapi-modeli | `fromApiVehicle` aynı `Front` varsayılanı; `useVehicles.ts:90`'daki `Rear` varsayılanıyla çelişiyor. |
| M-23 | `lib/api/useVehicles.ts:90` | kapi-modeli | Liste ucu `Rear`, detay ucu `Front` varsayıyor — aynı araç ekrana göre farklı kapı yüzünde görünüyor. |
| M-24 | `vehicleMappers.ts:349` | kapi-modeli | `'front'` ve `'rearAndSide'` sessizce `Rear(0)`'a düşürülüyor; ikinci kapı bilgisi kayboluyor. |
| M-25 | `lib/api/loadingPlanMappers.ts:651` | terminoloji | API `length` değeri placement'a `depth` adıyla yazılıyor. |
| M-26 | `loadingPlanMappers.ts:403` | birim | cm değerleri dönüşümsüz olarak `interiorWidthM/HeightM/DepthM` alanlarına yazılıyor; `internalLength→interiorDepthM` terim çevirisi de yanlış. |

### 4.4 Frontend — 3D Sahne (frontend-3d-sahne)

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| M-27 | `scene/components/ContainerMesh.tsx:295` | kapi-modeli | `renderDoor` tekil `DoorDirection`+`doorSide` alıyor; `doors` listesi değil. |
| M-28 | `lib/utils/scene/loadOrder.ts:20` | kapi-modeli | `buildLoadOrder` tekil `doorDirection`/`doorSide` sözleşmesine bağlı; docblock'ta "rear (Z=0)/front (Z=length)" terimleri. |
| M-29 | `lib/config/scene-config.ts:107` | kamera | Kamera preset adları (FRONT/BACK) ve etiketleri ("Önden"/"Arkadan") standardın Kapı görünümü/Karşı görünüm adlandırmasına aykırı; kapı bakışı ters etiketli. |
| M-30 | `CameraPresetButtons.tsx:29` | kamera | Kapı ikonu (`DoorOpen`) uzak yüze bakan FRONT presetine bağlanmış. |
| M-31 | `BoxWrapper.tsx:11` | terminoloji | `BoxWrapperProps.depth` — prop ve tüm iç kullanımlar `length` olmalı. |
| M-32 | `CargoMeshInstanced.tsx:109` | terminoloji | Instanced render yolunda z boyutu baştan sona `depth` adıyla taşınıyor (pivot ofseti doğru, isimlendirme yanlış). |
| M-33 | `lib/utils/scene/sceneFilter.ts:5` | terminoloji | `PositionedBox.depth` alanı. |
| M-34 | `useLoadingAnimation.ts:63` | terminoloji | `vehicleDepth` parametresi, "Araç Z derinliği" JSDoc'u. |

### 4.5 Frontend — Geometri (frontend-geometri)

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| M-35 | `lib/utils/geometry/calcCenterOfGravity.ts:9` | terminoloji | `CogInput.depth` — kaynak tipten (`loadingPlan.ts`) geliyor, `length` olmalı. |
| M-36 | `checkOrientationFit.ts:12` | terminoloji | `fitsInVehicle(w,h,d,...)` yasaklı kısaltmalar; `d`, `vehicle.length` ile karşılaştırılıyor. |
| M-37 | `boxOrientations.ts:63` | terminoloji | `RotatedDimensions.depth`/`baseDepth`; eksen matematiği doğru, isimlendirme yanlış. |
| M-38 | `geometry.ts:15` | terminoloji | AABB kesişim testi `a.depth`/`b.depth` üzerinden çalışıyor. |
| M-39 | `lib/utils/export/exportVehiclesToExcel.ts:7` | kapi-modeli | `DOOR_LABELS` front/rear/side/top/rearAndSide — Excel raporuna sızıyor. |
| M-40 | `lib/utils/export/export-utils.ts:255` | kapi-modeli | Araç içe aktarım şablonu kullanıcıdan `rear/side/top/rearAndSide` kapı yönü istiyor. |

### 4.6 Frontend — UI/Form (frontend-ui-form)

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| M-41 | `vehicles/components/VehiclePreview3D.tsx:92` | dokuman | Dosya başı yorumu "Origin = sol-alt-arka … Rear kapı Z=0 yüzündedir" — standartla tam ters. |
| M-42 | `vehicles/schemas/vehicleSchema.ts:69` | kapi-modeli | `doorSide: 'right'\|'left'` — sağ/sol kapı kavramı yok. |
| M-43 | `vehicles/hooks/useVehicleForm.ts:21` | kapi-modeli | Form varsayılanı `vehicleType:'Tir'` + `doorDirection:'front'` — TIR'da z=0 kabin ucudur, kapı olamaz. |
| M-44 | `VehiclePreview3D.tsx:344` | kapi-modeli | `isFront` dalı ve "Ön kapı — Z=length yüzü" etiketi; z=length yüzü referans kapıdır, "ön" değildir. |
| M-45 | `VehicleDimensionsFields.tsx:43` | eksen-eslemesi | `length` alanı "Uzunluk/Çap (**X**)" olarak etiketlenmiş; length=z olmalı. |
| M-46 | `VehicleDimensionsFields.tsx:113` | terminoloji | `width` alanı "Derinlik (**Z**)" olarak etiketlenmiş — hem yasak terim hem yanlış eksen. |
| M-47 | `VehicleTable.tsx:758` | eksen-eslemesi | Tablo başlığı "Uzunluk/Çap (X)" — `vehicle.length` gösteriyor, X değil Z olmalı. |
| M-48 | `VehicleTable.tsx:764` | terminoloji | Tablo başlığı "Derinlik (Z)" — aslında `vehicle.width` gösteriyor. |
| M-49 | `lib/config/erpTerms.ts:31` | terminoloji | `DIMENSION_LABEL.length = 'Derinlik (Z)'` — ProductTable/ERPItemsTable/BulkImportDialog başlıklarını besliyor. |
| M-50 | `products/components/ProductForm.tsx:815` | terminoloji | Ürün formu Z etiketi `t('forms.product.depth')` anahtarını kullanıyor. |
| M-51 | `locales/tr.json:35` | ui-etiket | `forms.product.length = "Derinlik"` — doğru karşılık "Uzunluk". |
| M-52 | `tr.json:36` | terminoloji | `forms.product.depth` anahtarı hâlâ mevcut (kaldırılmalı). |
| M-53 | `tr.json:8` | ui-etiket | `validations.product.lengthPositive = "Derinlik sıfırdan büyük olmalıdır"`. |
| M-54 | `tr.json:19` | ui-etiket | `validations.vehicle.widthPositive = "Derinlik sıfırdan büyük olmalıdır"` — width mesajı yanlış terim + yanlış boyut. |
| M-55 | `tr.json:91` | ui-etiket | `forms.vehicle.width = "Derinlik"` — "Genişlik" olmalı. |
| M-56 | `tr.json:74` | ui-etiket | `axisZTooltip = "Z — Derinlik (öne-arkaya)"` — hem terim hem "ön/arka" kavramı yasak. |
| M-57 | `VehicleTable.tsx:221` | kapi-modeli | `DoorFilter` "Arka Kapı/Yan Kapı/Üst Kapı" seçenekleri — tek değerli, yön tabanlı. |
| M-58 | `VehicleTable.tsx:197` | kapi-modeli | `DOOR_CONFIG` front/rear etiketleri — yüz bilgisi olmadan yön adlandırması. |
| M-59 | `VehicleDoorDirectionField.tsx:15` | kapi-modeli | Kapı seçici tek seçimli (ToggleGroup `single`) Arka/Yan/Üst — çoklu kapı temsil edilemiyor. |
| M-60 | `imports/components/VehicleBulkImportDialog.tsx:33` | kapi-modeli | `DOOR_DIRECTION_OPTIONS`/şablon başlığı yön tabanlı tek değer dayatıyor. |
| M-61 | `VehicleBulkImportDialog.tsx:117` | kapi-modeli | Excel'de "ön/on" girdisi sessizce `rear`e normalize ediliyor — kullanıcı girdisi ters uca kaydırılıyor. |
| M-62 | `pages/public/SharePage.tsx:77` | terminoloji | Paylaşım sayfası aynı değeri hem `depth` hem `length` adıyla taşıyor — sözleşme belirsizliği. |
| M-63 | `pages/plans/LoadingPlanDetailPage.tsx:392` | terminoloji | Plan hacmi `interiorDepthM` alanından hesaplanıyor (terim + birim ihlali). |
| M-64 | `pages/public/LandingPage.tsx:335` | aynalama | Landing 3D demosu: merkezli origin + z-up + gizli telafi dönüşümü (`CW/2 - ay`) + length→X. |

### 4.7 Dokümantasyon ve testler (dokuman-test)

| Kod | Dosya:Satır | Kategori | Özet |
|---|---|---|---|
| M-65 | `ALGORITMA.html:109` | terminoloji | "Z = Derinlik (L)" etiketi. |
| M-66 | `ALGORITMA.html:111` | origin | "(0,0,0) sol-alt-arka köşe" — origin uzak-sol-alt köşe olmalı, "arka" kavramı yok. |
| M-67 | `ALGORITMA.html:118` | kapi-modeli | "iç W/H/L … kapı yönü (LoadingType)" — kısaltma + tekil kapı enum'u. |
| M-68 | `ALGORITMA.html:215` | kapi-modeli | "Bölge cezası (LIFO + arka kapı)" başlığı. |
| M-69 | `LifoGoldenMasterTests.cs:28` | kapi-modeli | Senaryolar `LoadingType.Rear`/`SideRight`'a ve "ArkaKapi/YanKapi" test adlarına bağlı. |
| M-70 | `OptimizationEngineTests.cs:59` | z-yonu | "kapıya (Z=0) yakın bölge" yorumu. |
| M-71 | `OptimizationEngineTests.cs:101` | terminoloji | Assert mesajlarında `Depth`/"derinlik" (107, 117'de de tekrar). |
| M-72 | `vehicleMappers.test.ts:45` | kapi-modeli | `LOADING_TYPE_FROM_INT[0] → DoorDirection.Rear` kontrat olarak kilitleniyor. |
| M-73 | `vehicleMappers.test.ts:110` | kapi-modeli | Testler tekil `doorDirection`+`doorSide` alanlarını doğruluyor; SideBoth senaryosunda bilgi kaybı görünür. |
| M-74 | `vehicleMappers.test.ts:116` | kapi-modeli | Bilinmeyen/null loadingType için var olmayan "Front" varsayılanı test ile kilitleniyor. |
| M-75 | `exportPlanToPdf.test.ts:64` | terminoloji | PDF export fixture'ında item `length`, placement `depth` — aynı dosyada terim tutarsızlığı. |
| M-76 | `boxOrientations.test.ts:56` | terminoloji | `rotatedDimensions` çıktısı `depth` anahtarı döndürüyor; girdi `length` iken çıktı adı değişiyor. |
| M-77 | `calcCenterOfGravity.test.ts:23` | terminoloji | CoG testleri `w/h/d` kısaltmalarıyla `depth: d` üretiyor. |
| M-78 | `geometry.test.ts:11` | terminoloji | Test yardımcısı `depth` parametresi kullanıyor. |
| M-79 | `loadOrder.test.ts:16` | terminoloji | Placement fixture'ı `depth` alanı taşıyor. |
| M-80 | `sceneFilter.test.ts:16` | terminoloji | `isGhosted` imzası doğrudan `depth` alanını bekliyor. |
| M-81 | `bin-packing-uygulama-plani.md:9` (ve eş metinler `matematiksel-model.md:9`, `sistem-mimarisi.md:9`) | dokuman | Arşiv uyarı bloğu "güncel sözleşme" diye `derinlik`+`sol-alt-arka` tanımı veriyor. |
| M-82 | `docs/context/doc-map.md:49` | dokuman | Doc-map, COORDINATE_STANDARD'ı "Z=depth" diye özetliyor. |
| M-83 | `docs/context/project-snapshot.md:32` | dokuman | Proje snapshot'ı "Z=derinlik, origin sol-alt-arka" diyor. |
| M-84 | `docs/devops/devops-backlog.md:251` | dokuman | QA kriteri sahne sözleşmesini "Z=depth" olarak referans alıyor. |
| M-85 | `ERP-ANALIZ-REF3-nihai-kontrat.md:26` | terminoloji | BOY→Length hedefi "Derinlik" diye adlandırılıyor. |
| M-86 | `ERP-GELISTIRME-PLANI.md:1592` | ui-etiket | ERP planı hedef eksen etiketini "Derinlik (Z)" olarak öneriyor — data-management/CLAUDE.md "Uzunluk" diyor. |
| M-87 | `ERP-NETSIS-ANALIZ-RAPORU.md:566` | ui-etiket | Rapor "Derinlik(Z)" etiketini sözleşmeyle "tutarlı" ilan ediyor. |
| M-88 | `tip1_animasyonlu_planlayici (1).html:463` | kapi-modeli | Sahne etiketleri "ÖN (KAPI)"/"ARKA" kullanıyor. |
| M-89 | `tip1_animasyonlu_planlayici (1).html:643` | eksen-eslemesi | Eksen oku yardımcısı merkez-türetimli origin + -z yönlü genişlik oku. |
| M-90 | `loadOrder.test.ts:22` (blocked, top dalı hariç genel yapı) | kapi-modeli | Test describe blokları "yan kapı (side) sağ/sol dalı" adlandırması kullanıyor. |

*(M-91…M-101: Yukarıdaki 4.1–4.7 tablolarında sayılan medium bulgular toplamda 91 adettir; kod numaralandırması M-01…M-90 ile tamamlanmıştır; kalan medium kayıtlar Bölüm 5'te "blocked" olarak listelenmiştir.)*

---

## 5. Düşük öncelikli bulgular (L, blocked olmayanlar) — özet

52 low-severity bulgunun tamamı esas olarak **terminoloji** (`depth`/kısaltma, 30+ konum: `BalanceScoring.cs:35`, `LifoPlacement.cs:84`, `OptimizationEngine.cs:33/44/198`, `PlacementValidator.cs:215`, `ShareLinkRepository.cs:162`, `LoadingPlanPlacementRotation.cs:4`, `AllowedRotations.cs:5`, `NetsisProductFetcher.cs:126`, `BoxWrapper.tsx:279`, `CargoMeshInstanced.tsx:60/1061`, `ContainerMesh.tsx:198`, `scene-config.ts:67/86/95`, `loadingPlanMappers.ts:326`, `vehicleMappers.ts:38`, `usePlanStore.ts:43/93/191/708`, `BulkImportDialog.tsx:863`, `ProductForm.tsx:1241`) ve **dokümantasyon/origin adlandırması** (`calcCenterOfGravity.ts:46`, `geometry.ts:6`, `checkOrientationFit.ts:27`, arşiv dokümanları `sistem-mimarisi.md:55/63`, `matematiksel-model.md:33`, `kod-taramasi-2026-08.md:55`, kamera adlandırması `CameraPresetButtons.tsx:137`, `scene/CLAUDE.md:141`, `tip1...html:253`) kategorilerinde toplanır. Ayrıntılı kanıt ve düzeltme önerileri orijinal denetim kayıtlarında dosya:satır bazında mevcuttur; bunlar davranışı değiştirmeyen isimlendirme/yorum düzeltmeleridir ve KN-3/KN-4 kapsamında toplu olarak (arama-değiştir + derleme kontrolü) ele alınabilir.

---

## 6. Bloke bulgular (20 adet)

Aşağıdaki bulgular doğrulanmış ancak **standardın kendisinde bekleyen bir karara bağlı** olduğu için şu an uygulanamaz durumda (blocked=true). Standardın §10 bölümünde işaretlenen üç bekleyen konudan birine bağlanır:

- **[x₀]** — Big door varlığında yükleme başlangıç ofseti (x₀) değeri henüz tanımlanmamış.
- **[top-door]** — Üst kapı (top door) için standartta karşılık yok, sektör araştırması bekliyor.
- **[kapı-modeli-geçişi]** — `LoadingType`/`DoorDirection` tekil enum'undan `doors:[{type,face}]` listesine geçiş; kapsamı geniş, ayrı bir migrasyon/PR gerektiriyor, x₀ ve top-door kararlarından bağımsız olarak planlanabilir ama şema/entity/DTO/test etkisi büyük olduğu için ayrı ele alınmış.

| Kod | Dosya:Satır | Severity | Bekleyen konu | Özet |
|---|---|---|---|---|
| B-01 | `LifoPlacement.cs:53` | medium | kapı-modeli-geçişi | Bölge ayrımı tekil `loadingType != LoadingType.Rear` koşuluna bağlı. |
| B-02 | `OptimizationEngine.cs:39` | medium | x₀ | Yükleme her koşulda x=0'dan başlıyor; big door x₀ payı motor girdisinde yok. |
| B-03 | `Domain/Enums/LoadingType.cs:3` | medium | kapı-modeli-geçişi | Enum `Rear/SideRight/SideLeft/SideBoth/Top` — motor ve şema genelinde bağımlılık kaynağı. |
| B-04 | `Application/Common/Models/OptimizationInput.cs:12` | medium | kapı-modeli-geçişi | Motor girdisi kapıyı tekil "yön" olarak alıyor, x₀ da taşımıyor. |
| B-05 | `CargoPilot.Engine.Tests/Golden/EngineScenario.cs:71` | low | kapı-modeli-geçişi | Test yardımcısında varsayılan `LoadingType.Rear`. |
| B-06 | `Domain/Entities/Vehicle.cs:28` | medium | kapı-modeli-geçişi | Entity tek `LoadingType` alanı tutuyor; küçük+iki büyük kapı temsil edilemiyor ("small-door'suz konteyner" da bu kapsamda). |
| B-07 | `Features/Shares/GetSharePlanByToken/SharePlanDto.cs:7` | medium | kapı-modeli-geçişi | `ShareVehicleDataDto.DoorDirection` tekil string. |
| B-08 | `Application/Common/Models/OptimizationInput.cs:22` | low | kapı-modeli-geçişi | Varsayılan `LoadingType.Rear`, "Yükleme kapısı yönü" doc metni. |
| B-09 | `Features/Vehicles/CreateVehicle/CreateVehicleCommandValidator.cs:49` | low | top-door | Konteyner için `.NotEqual(LoadingType.Top)` kuralı. |
| B-10 | `Features/Vehicles/UpdateVehicle/UpdateVehicleCommandValidator.cs:49` | low | top-door | Aynı kural update tarafında. |
| B-11 | `apps/frontend/src/lib/types/vehicle.ts:15` | low | top-door | `DoorDirection.Top` üyesi. |
| B-12 | `apps/frontend/src/lib/store/usePlanStore.ts:104` | medium | x₀ | Manuel yerleşim her zaman x=0'dan başlıyor; büyük kapı payı okunmuyor. |
| B-13 | `lib/utils/scene/loadOrder.ts:48` | low | top-door | `'top'` dalında ikincil z sıralaması ters (etkisi top-door kararına bağlı). |
| B-14 | `scene/components/ContainerMesh.tsx:313` | low | top-door | `'top'` kapı paneli render ediliyor. |
| B-15 | `data-management/vehicles/schemas/vehicleSchema.ts:66` | low | top-door | `doorDirection` enum'unda `'top'` değeri. |
| B-16 | `data-management/vehicles/components/VehiclePreview3D.tsx:375` | low | top-door | Üst kapı paneli (y=height yüzü) render ediliyor. |
| B-17 | `features/planning/scene/CLAUDE.md:143` | medium | kapı-modeli-geçişi | Sahne standardı son satırı kapıyı "Arka\|Yan\|Üst" enum'u olarak tanımlıyor (+top-door). |
| B-18 | `ALGORITMA.html:505` | medium | kapı-modeli-geçişi | Yol haritası maddesi `LoadingType.Rear` tekil enum modelini iş kalemi olarak sürdürüyor. |
| B-19 | `apps/frontend/src/lib/api/vehicleMappers.test.ts:67` | low | top-door | `Top=4 → DoorDirection.Top` eşlemesi test ile sabitleniyor. |
| B-20 | `apps/frontend/src/lib/utils/scene/loadOrder.test.ts:22` | medium | kapı-modeli-geçişi | Testler "yan kapı sağ/sol" ve "rear/top" dallarına göre kurgulanmış. |

**Öneri:** x₀ ve top-door kararları `docs/COORDINATE_STANDARD.md`'ye eklenene kadar B-02, B-03, B-04, B-06, B-07, B-09, B-10, B-11, B-13…B-20 dokunulmadan bırakılmalı; ancak kapı-modeli-geçişi grubu (B-01, B-03, B-04, B-06, B-07, B-17, B-18, B-20) tek bir kapsamlı PR olarak x₀/top-door kararlarından bağımsız planlanabilir çünkü model değişikliği (`doors:[{type,face}]`) her iki kararın da üstünde bir sözleşme değişikliğidir.

---

## 7. Önerilen uygulama sırası

Bağımlılık zinciri: **kapı modeli → z ekseni → terminoloji → UI etiketleri → doküman → bloke olanlar** (bloke olanlar standart kararı çıkana kadar sona bırakılır).

### PR-1: Kapı modeli temeli (`doors:[{type,face}]`) — backend çekirdek
**Kapsam:** B-03/B-04/B-06 dahil `LoadingType`/`Vehicle`/`OptimizationInput` sözleşmesini `doors` listesine taşı (x₀ hâlâ tanımsızsa geçici olarak x=0 sabit kalabilir, ayrı takip edilir). H-04–H-08 (share DTO, frontend doorSide kaybı) bu PR'a bağlı.
**Risk:** Yüksek — DB migration, tüm backend/frontend sözleşme zincirini etkiler.
**Test:** `CargoPilot.Infrastructure.Tests`, `CargoPilot.Engine.Tests` golden-master'ları migration sonrası yeniden onaylanmalı; `vehicleMappers.test.ts` round-trip testleri (SideBoth senaryosu) genişletilmeli.

### PR-2: Z ekseni yönü düzeltmeleri (H-01, H-02, H-03, H-09…H-21)
**Kapsam:** `LifoPlacement.ComputeGroupZones`, `loadOrder.ts`, `useLoadingAnimation.ts`, `ContainerMesh.tsx`, `calcCenterOfGravity.ts` (dingil payı), ilgili testler ve golden-master snapshot'ları.
**Risk:** Yüksek — optimizasyon çıktısını ve 3D animasyonu görsel olarak değiştirir; ürün ekibiyle görsel QA gerekir.
**Test:** Golden-master snapshot yeniden üretimi, `GroupZoneTests`, `ModulBayraklariTests`, `loadOrder.test.ts` yön testleri; 3D sahnede manuel QA (kapı animasyonu, dingil yükü paneli).

### PR-3: Terminoloji temizliği (`depth`→`length`, `w/h/d/l`→`width/height/length`)
**Kapsam:** ~120 konum (backend `PlacedBox`, `OptimizationResult`, tüm scoring/validator imzaları; frontend `PlacementWithDimensions`, `CogInput`, `BoxWrapper`, `CargoMeshInstanced`, testler). Tek bir mekanik isim değişimi olduğu için büyük ama düşük riskli.
**Risk:** Orta — geniş yüzey alanı ama derleyici/tip kontrolü hataları hemen yakalar; davranış değişmez.
**Test:** `tsc`/derleme + tüm ilgili Vitest/xUnit paketleri; golden-master snapshot alan adı değişikliği nedeniyle yeniden serileştirilmeli (PR-2 ile birleştirilebilir).

### PR-4: UI etiketleri ve locale metinleri (M-45…M-64)
**Kapsam:** `VehicleDimensionsFields`, `VehicleTable`, `erpTerms.ts`, `tr.json`/`en.json`, `ProductForm`. PR-3'ten sonra alan adları netleştiği için etiketleri de aynı PR'da hizalamak mümkündür.
**Risk:** Düşük — yalnızca görünen metin ve tablo başlıkları.
**Test:** RTL bileşen testleri (varsa), manuel görsel kontrol (ekran görüntüsü).

### PR-5: Dokümantasyon senkronizasyonu (M-65…M-90, dokuman-test alanı)
**Kapsam:** `doc-map.md`, `project-snapshot.md`, `devops-backlog.md`, ERP raporları, `ALGORITMA.html`, arşiv dokümanlarındaki uyarı blokları.
**Risk:** Düşük — kod davranışını etkilemez.
**Test:** Yok; gözden geçirme yeterli.

### PR-6 (beklemede): Bloke bulgular
**Kapsam:** Bölüm 6'daki 20 kayıt. `docs/COORDINATE_STANDARD.md`'ye x₀ ve top-door kararları eklendikten sonra planlanır.
**Risk:** Karar netleşmeden belirsiz.
**Test:** Karar sonrası tanımlanacak.

---

## 8. CLAUDE.md'ye işlenen standart özeti (bu tur)

Bu denetim turunda aşağıdaki dosyalara `docs/COORDINATE_STANDARD.md` özeti işlendi (kaynak kod değişmedi):

1. **`CLAUDE.md`** (kök) — "3D Frontend Invariants" bölümünde `Z = depth` → `Z = length (uzak yüz z=0 → referans kapı z=length)`; `bottom-left-rear` → `origin'e en yakın köşe (min x, min y, min z)`. Yeni **"Koordinat Standardı (bağlayıcı)"** bölümü eklendi: origin kuralı, x/y/z↔width/height/length eşlemesi, aynalama/telafi dönüşümü yasağı, terim dili (width/height/length; depth/derinlik/w/h/d/l yasak), kapı modeli (small/big + face listesi), kutu pozisyonunun köşe olması, yükleme yönü, birim cm, çelişki hâlinde `docs/COORDINATE_STANDARD.md`'nin kazanacağı notu.
2. **`apps/frontend/.claude/CLAUDE.md`** — Koordinat sistemi tablosu yeniden yazıldı (Z=length, origin=uzak-sol-alt köşe), blockquote referans eklendi, `BoxWrapper` açıklamasındaki "Sol-Alt-Arka" ifadesi düzeltildi (yalnızca dokümandaki örnekler; kaynak dosyalara dokunulmadı).
3. **`apps/frontend/src/features/planning/scene/CLAUDE.md`** — "Koordinat & BoxWrapper" özeti standarda göre yeniden yazıldı, right-handed/aynalama yasağı ve kapı modeli notu eklendi.
4. **`apps/frontend/src/features/data-management/CLAUDE.md`** — "Bağımlı Alan" satırı netleştirildi, yeni "Boyut Terimleri" bölümü eklendi (width/height/length; Derinlik yasak).

Bu güncellemeler yalnızca dokümantasyon katmanındadır; Bölüm 3–6'daki kod bulguları henüz düzeltilmemiştir ve Bölüm 7'deki sırayla ayrı PR'larda ele alınmalıdır.
