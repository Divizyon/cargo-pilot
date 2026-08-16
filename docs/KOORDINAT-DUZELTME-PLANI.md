# Koordinat Denetimi — Düzeltme Planı

**Kaynak:** `docs/KOORDINAT-BRANCH-DENETIMI-2026-08-16.md` (S-01…S-71)
**Dal:** tüm iş `feat/koordinat-standardi-uyumu` üzerinde, faz = ayrı commit(ler). PR'ı kullanıcı açtırır ve **kullanıcı merge eder**.
**Sıra bağlayıcı:** Faz 1–3 üretim doğruluğu; 4 paralel gidebilir; 5–10 sonrası.

Her fazın sonunda dar doğrulama: ilgili `dotnet test` filtresi + `npx tsc --noEmit` + ilgili vitest dosyaları. Faz bitince bu dosyadaki kutucuğu işaretle.

---

## Faz 1 — Motor yön düzeltmesi + golden kapsam ✅
**Bulgular:** S-04, S-14, S-46, S-44, S-45, S-34
**Durum:** tamamlandı (commit: motor yönü). Backend 302/302. Mevcut 16 snapshot'ın Outcome/Items bölümleri **birebir aynı** kaldı, yalnızca Vehicle bölümüne `FillFromMaxX` + `HasReferenceDoor` eklendi; 1 yeni snapshot. S-45 sadeleştirme yerine yorum düzeltmesi olarak yapıldı (aşağıya bak).

- [x] **S-04** `OptimizationEngine.cs:65` — LIFO bölge tohumu `(0m, 0m, zoneStart)` → `(startX, 0m, zoneStart)`. `fillFromMaxX` modunda tohumlar `ex = ax - width < 0` ile eleniyor, bölge disiplini sessizce ölü.
- [x] **S-14** `VolumeScoring.cs:42` — `vehicleWidth - ex` → `vehicleWidth - (ex + boxWidth)`; `width` `ComputeScore` imzasında zaten var. Aynalı modda terim yönelime bağlı kalmasın.
- [x] **S-46** `OptimizationEngine.cs:103` — aday sıralamasının x eşitlik bozucusu yön-farkında değil; `fillFromMaxX` iken tersine çevir (ayna simetrisi).
- [x] **S-44** `LifoPlacement.cs:77-83` — decimal kalıntısı (250/3 → `ZStart=1E-26`); bölge sınırlarını hesaplarken kalıntıyı sıfıra yuvarla ya da son bölgeyi `0`'a sabitle.
- [x] **S-45** `LoadingCorner.cs:32-35` — koruma **bırakıldı**, yalnızca yorum düzeltildi. Sadeleştirme denendi ama `VehicleDoorTests.IkiYandaBigDoor_YonDegistirmez` kırıldı: koruma ölü kod değil, "serbest köşe yoksa yön değiştirme" kararı. Yorumdaki karşılıksız geri-uyum vaadi yerine ulaşılamazlığın nedeni (`IX_VehicleDoors_TekKapiTipi`) yazıldı.
- [x] **S-34** Golden/invariant kapsamı: `EngineScenario`/`SnapshotPayload`'a `FillFromMaxX` + `HasReferenceDoor` alanları; en az bir **Lifo + fillFromMaxX=true + 3 grup** snapshot'ı. Snapshot'lar bu fazda tek seferde yeniden üretilir.

**Doğrulama:** `dotnet test CargoPilot.Engine.Tests` + `--filter YuklemeBaslangicKosesi|GroupZone|Lifo` (Infrastructure). Yeni snapshot diff'i gözle incelenir: yalnızca yeni senaryolar eklenmiş olmalı, mevcut 16 snapshot değişmemeli (S-14/S-46 aynalı modu etkiler; aynasız çıktı değişirse dur ve nedenini raporla).

---

## Faz 2 — Kapı sözleşmesinin okuma yolları
**Bulgular:** S-01, S-02, S-03 (+ frontend fallback temizliği)

- [ ] **S-03** `DuplicateVehicleCommandHandler.cs` — `duplicate.ReplaceDoors(source.Doors.Select(d => (d.Type, d.Face)))`; kaynak boşsa `DoorSetFactory.EnsureDoors(duplicate)`. (Önce bu: S-02 düzelse bile kopyalar kapısız kalırdı.)
- [ ] **S-01** `SharePlanDto` → `IReadOnlyList<VehicleDoorDto> Doors`; `ShareLinkRepository` sorgusuna `.ThenInclude(v => v.Doors)`; `MapDoorDirection` + `string DoorDirection` sil. `share.ts:47` zaten `doors` bekliyor; `SharePage.tsx:61`'deki `?? [{Small,LengthZ}]` fallback'i yalnızca gerçekten boş liste için kalsın.
- [ ] **S-02** `VehicleInPlanDto` → `Doors` alanı; `LoadingPlanRepository.cs:193`'e `.ThenInclude(v => v.Doors)`; `MapToDetailDto` doldursun. Frontend `loadingPlanMappers`'ta plan yolundaki `loadingType` fallback'i kalksın (`resolveDoors` ikinci argümanı `undefined`).

**Doğrulama:** Application testleri + share/plan mapper vitest'leri. Manuel: yan kapılı aracın planını paylaş, public sayfada kapı doğru yüzde mi.

---

## Faz 3 — Tek kaynak + geriye uyum (migration içerir)
**Bulgular:** S-13, S-15, S-16, S-17, S-22, S-47, S-48, S-66

- [ ] **S-13** Yeni migration: `UPDATE [Vehicles] SET [LoadingType] = 1 WHERE [LoadingType] = 3;` (backfill'in kendi `3 → Big@WidthX` seçimiyle tutarlı). Ölü `3` anahtarlarını temizle: `vehicleMappers.ts:47-52` yorumu, `goldenCrossCheck.test.ts:38-44`, `AddVehicleModal.tsx:82`.
- [ ] **S-15** `UpdateVehicleCommandHandler` — `Doors` gönderilmediyse `EnsureDoors` geri düşmesi; `LoadingType` ile `Doors` birlikte gönderildiyse validator'da çapraz kural (`loadingTypeFromDoors(Doors) == LoadingType` ya da `LoadingType`'ı yok sayıp doors'tan türet — **türetme tercih edilir**, karar commit mesajına yazılır).
- [ ] **S-16** `LoadingCorner.FillFromMaxX` → `bool?` dönsün, boş listede `null`; çağıran `?? (vehicle.LoadingType == LoadingType.SideLeft)` ile eşlesin (HasReferenceDoor ile aynı semantik).
- [ ] **S-17** `VehicleConfiguration` — `LoadingType` kolonu türetilmiş değer olarak kalır (3/3c'de tamamen kalkacak); şimdilik yalnızca yorum + validator senkronu.
- [ ] **S-22** `loadingTypeFromDoors` boş listede `0` uyduruyor — boş liste durumunda çağıran tarafta guard (`doors.length === 0` ise alan gönderme) ya da açık yorum; davranış değişikliği migration sonrası değerlendirilir.
- [ ] **S-47** `VehicleDoorRules.Validate` imzasına `VehicleType` ekle: Container + `DoorType.Top` reddi (eski enum kuralının doors karşılığı). İki validator'da da kullan.
- [ ] **S-48** `DoorFace.ZeroZ` hiçbir tipte geçerli değil: backend enum'dan **silme** (EF string saklıyor, veri yok, güvenli) + `vehicle.ts`'ten çıkar. Silme riskliyse `[Obsolete]` + zod'dan çıkarma; karar commit'e yazılır.
- [ ] **S-66** `algorithm-test-ui/.../vehicleMappers.ts:18-21` ölü `3: Side` anahtarı (Faz 4 ile birleşebilir).

**Doğrulama:** `dotnet ef migrations has-pending-model-changes` temiz; Application testleri; migration'ı test DB'ye uygula, `SELECT COUNT(*) WHERE LoadingType=3` → 0.

---

## Faz 4 — `algorithm-test-ui` doğrulama aracını canlandır (paralel gidebilir)
**Bulgular:** S-71 → S-07 → S-05+S-06 → S-12, S-38–S-43, S-67, S-68
**Zorunlu sıra:** S-71 (bağımlılık kurulumu) ve S-07 (NaN kapısı) düzelmeden S-05'in düzeldiği görülemez. S-05 ile S-06 **aynı commit'te** — biri diğerini kırar.

- [ ] **S-71** `apps/algorithm-test-ui` bağımlılıklarını kur, kök workspace'e/CI'a bağla; `test:ci` gerçekten çalışsın.
- [ ] **S-07** `goldenCrossCheck.test.ts` — `Depth` → `Length`; `as Snapshot` cast'ini zod parse'a çevir; `Lifo_*` fixture'ları için `zoneOverflow === 0` assertion'ı.
- [ ] **S-05+S-06** `lifoZones.ts` — `zStart: vehicleLength-(index+1)*zoneSize, zEnd: vehicleLength-index*zoneSize`; test beklentileri backend `LifoPlacement.cs:83` aynasına çevrilir.
- [ ] **S-12/S-38/S-43** Mapper `doors` okusun; `DoorDirection` enum'u yerine `doors: VehicleDoor[]`; bölge kapısı `HasReferenceDoor` aynası.
- [ ] **S-39** `depth` → `length` (tip + 12 kullanım + `ROTATION_LABEL` W,H,L → G,Y,U).
- [ ] **S-40/S-41/S-42** `PlacementCanvas2D` — etiket "0 = uzak yüz"; `perpAscending` kamera z=length'e göre `true`; "Üstten" görünümün +X yönü front paneliyle tutarlı.
- [ ] **S-67/S-68** Yön/başlangıç köşesi doğrulayan kural ekle; "sol-alt-arka" metinleri temizle.

**Doğrulama:** `npx tsc --noEmit && npx vitest run` (algorithm-test-ui) — S-07 sonrası mevcut fixture'larla koş; S-05 düzeltmesi öncesi kasıtlı fail görülmeli, sonrası yeşil.

---

## Faz 5 — Birim sınırını tekilleştir
**Bulgular:** S-11 (önce — kalıcı veri bozuyor), S-10, S-24, S-25, S-28, S-29, S-21, S-32

- [ ] **S-11** `useVehicles.ts` arşivle/sil — tam-üstüne-yazan PUT yerine dönüşümsüz `buildUpdateVehiclePayloadFromVehicle(vehicle)` (cm/kg değerleri olduğu gibi, `layerCount` doğru anahtar, kingpin/aks korunur); `as VehicleFormValues` cast'i kalkar. Alternatif: backend'e minimal `PATCH`-vari uç — kapsamı büyütmeden mevcut PUT ile dönüşümsüz payload tercih edilir.
- [ ] **S-10** Toplu araç import'u cm/kg sabit: `buildCreateVehiclePayload`'a `unit: 'raw-cm'` parametresi ya da doğrudan `CreateVehicleRequest` kur.
- [ ] **S-24** `AddVehicleModal` ölçüleri `toCentimeters`/`toKilograms`'tan geçir.
- [ ] **S-25** Kingpin/aks: form değeri görüntü biriminde → `*Mm` alanına yazarken çevir (adı `Mm` ama cm taşıyorsa önce gerçek semantiği koddan doğrula, karar commit'e yazılır); okuma yolu simetrik.
- [ ] **S-28** `VehiclePreviewPanel` çift dönüşüm kalkar (form değeri zaten görüntü biriminde).
- [ ] **S-29** `VehicleDimensionsFields` — `calcVolume`'a cm verilecek şekilde çevir.
- [ ] **S-21** `LoadingPlanDetailPage` — cm³ değeri m³'e çevirip göster (÷1e6) ya da etiketi düzelt; m³ tercih.
- [ ] **S-32** Excel export başlıkları "İç ..." + importer başlıklarıyla ve kapı sözlüğüyle round-trip uyumu.

**Doğrulama:** vitest mapper/format testleri; manuel: mm+ton ayarıyla araç arşivle → ölçüler değişmemeli.

---

## Faz 6 — Plan sihirbazı + form kayıpları
**Bulgular:** S-09, S-23, S-26, S-27

- [ ] **S-09** `AddVehicleModal` yerel `FORM_VEHICLE_TYPE_INT` silinir → `VEHICLE_TYPE_INT` import (Kamposet/Konteyner ters kaydediliyor).
- [ ] **S-23** Modal `doors` göndersin; `useVehicles.ts:488-497` şemasına `doors` alanı (yoksa `.parse()` düşürüyor); "yan" seçimi sessizce `SideRight`e sabitlenmesin — varsayılan `DEFAULT_BIG_DOOR_FACE`.
- [ ] **S-26** `VehicleDoorsField` — mevcut `Top` kapı korunmalı: `buildDoors` bilinmeyen tipleri (Top) geçirsin, `resolveSetKey` top-only araçta da anlamlı durum göstersin (üç seçenek UI'ı değişmez; Top formda sorulmuyor ama silinmemeli).
- [ ] **S-27** Toplu import: eski şablonun `Kapı Yönü` sütunu ve `side`/`rearAndSide`/`top` değerleri tanınsın (alias tablosuna eklenir), tanınmayan değer `'arka'`ya sessiz düşmesin — satır hatası göstersin.

**Doğrulama:** vitest + manuel: eski şablon dosyasıyla import denemesi.

---

## Faz 7 — Frontend yerleşim ve sıralama
**Bulgular:** S-18, S-19, S-20

- [ ] **S-18** `usePlanStore.buildPlacements` — `fillsFromMaxX(vehicle.doors)` okunsun; manuel yerleşim imleci doğru köşeden başlasın.
- [ ] **S-19** Cursor ve kümülatif ağırlık `isStagingArea` kutularını saymasın.
- [ ] **S-20** `buildLoadOrder`/`seqNo` staging kutularını dışlasın (`CameraPresetButtons.tsx:79`'daki filtre örnek).

**Doğrulama:** `loadOrder.test.ts` + yeni store testleri.

---

## Faz 8 — Sahne yön türevleri (tek görsel QA turu)
**Bulgular:** S-30, S-53, S-31, S-56, S-57, S-52, S-55, S-54, S-58

- [ ] **S-30** Referans kapı kanat dönüş işaretleri z=length yüzüne göre (dışarı süpürsün).
- [ ] **S-53** Izgara/çerçeve `-Z` ofseti kapının yeni yüzüne göre dışarı.
- [ ] **S-31** `sceneFilter` X-Ray z=length (kamera tarafı) yönünden soysun; test gerçek yön beklentisiyle güncellenir.
- [ ] **S-56** Boş `doors`'ta mesh ile animasyon aynı varsayımı kullansın (ikisi de referans kapı varsay).
- [ ] **S-57** `useLoadingAnimation` — `doors = []` parametre varsayılanı her render yeni dizi: modül sabiti `EMPTY_DOORS` kullan.
- [ ] **S-52/S-55** Yan/üst kapı açıları fiziksel aralığa (≤ ~110°) çekilir (main'den beri var, regresyon değil).
- [ ] **S-54** Sağ kanat `scale={[-1,1,1]}` yerine geometriyi gerçek dönüşle kur (standart lafzı).
- [ ] **S-58** FRONT preset ikonundan `DoorOpen` kalkar (kapısız yüz).

**Doğrulama:** tsc + vitest; **kullanıcı görsel QA yapar** (kanatlar dışarı, ızgara dışarıda, X-Ray doğru taraftan).

---

## Faz 9 — Export/rapor
**Bulgular:** S-08, S-33, S-59, S-61
**Bağımlılık:** S-33, Faz 5'teki S-25 bitmeden yapılmaz (aks uzaklıkları birim tuzağı).

- [ ] **S-08** `PlanPdfDocument.tsx:445` — `row.weight * row.count` → `row.weight` (weight zaten N kez birikti). `totalWeight == Σ grup` birim testi.
- [ ] **S-33** `calcCenterOfGravity` aks payları kingpin/axleB uzaklıklarından (kasa uçları değil).
- [ ] **S-59** `boxOrientations` ön/arka yüz etiketleri ↔ `allowFaceFront/Back` eşlemesi netleştirilir (bugün etkisiz, yorum yeterli olabilir).
- [ ] **S-61** `VehiclePreview3D` ölü `kingpinDistance` prop'u: ya kullan (gerçek konum) ya kaldır.

---

## Faz 10 — Doküman + terminoloji (en geç Faz 3 ile eşzamanlı başlar)
**Bulgular:** S-35, S-36, S-37, S-69, S-70, S-49, S-50, S-51, S-60, S-62–S-65

- [ ] **S-35** `scene/CLAUDE.md:88` + `.claude/CLAUDE.md:415` — "uygulanmayan tek kısım kapı modeli" cümlesi silinir (`clearanceCm` referansı dahil).
- [ ] **S-36** `COORDINATE_STANDARD.md` §4/§10 — "kodda yok" rozetleri güncellenir, `SideBoth` listeden düşer, `ComputeGroupZones` açıklaması `zonesApply`'a çevrilir, §10 iç çelişkisi giderilir.
- [ ] **S-37** `coordinate-standard.html` — "ve/veya iki uçta" ifadeleri tek-kapı-tipi kuralına çekilir; "kodda yok" rozetleri temizlenir.
- [ ] **S-69** Yasaklı terim taraması (`depth/derinlik/W,H,L/sol-alt-arka` ~25 isabet) — Unicode-aware boundary ile, `depthWrite/depthTest` (Three.js) hariç.
- [ ] **S-70** `KOORDINAT-UYUM-RAPORU.md`, `ALGORITMA.html` (commitlenmez), `kod-taramasi-2026-08.md`, `doc-map.md`, `project-snapshot.md` bayat satırlar.
- [ ] **S-49** Down migration'a kapı→enum indirgeme (ya da açık "geri alınamaz" notu).
- [ ] **S-50** Backfill `WHERE IsDeleted=0` — geçmişe dönük migration değiştirilmez; yeni temizlik migration'ı ile silinmiş araçların kapı satırları soft-delete edilir.
- [ ] **S-51** `useVehicles.ts:159-165` sessiz `safeParse` düşürmesi loglansın (216-226 kardeş yol örnek).
- [ ] **S-60** LandingPage demosu: izole; standarda not düşülür ya da dönüştürülür (düşük öncelik).
- [ ] **S-62–S-65** Test adlandırma/kırılganlık düzeltmeleri (`Lifo_YanKapi_BolgeUygulanmaz` adı, `GroupZoneTests` elle kopyalanmış sınırlar, round-trip test adı, FE/BE ilk-big-door farkı yorumu).

---

## Çalışma kuralları (özet)

1. Faz = bir veya birkaç commit; her commit mesajında ilgili S-kodları geçer.
2. Zorunlu birliktelikler: (S-05+S-06), (S-07 önce), (S-13 migration + validator aynı commit), (S-01 + frontend fallback), (S-25 → S-33).
3. Snapshot yenilemesi yalnızca Faz 1'de; başka fazda golden değişirse dur, nedenini raporla.
4. Root'taki `ALGORITMA.html` ve `ERP-*.md` dosyaları commit'lenmez.
5. PR'ları kullanıcı merge eder; iş bitince PR açılır, doğrulama sonuçları yazılır, orada durulur.
6. Her fazdan sonra rapordaki §7 doğrulama komutlarının ilgili satırları koşulur; faz kutucuğu işaretlenir.
