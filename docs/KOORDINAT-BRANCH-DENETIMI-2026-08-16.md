# Koordinat Standardı — Branch Uygulama Denetimi

**Tarih:** 2026-08-16
**Kapsam:** `feat/koordinat-standardi-uyumu` ↔ `main` (merge-base `9c019e16`, 84 commit, 873 dosya)
**Referans standart:** `docs/COORDINATE_STANDARD.md` · `docs/coordinate-standard.html`
**Önceki denetimler:** `docs/COORDINATE_AUDIT.md` (2026-08-12) · `docs/KOORDINAT-UYUM-RAPORU.md` (2026-08-15)

**Yöntem:** 9 boyutta (backend motor, domain/sözleşme, kalıcılık, frontend tip/API/store,
3D sahne, geometri, UI/form, test+doküman, `algorithm-test-ui`) paralel kod okuma; her
boyutun bulguları ayrı bir adversarial doğrulama ajanı tarafından dosya:satır kanıtıyla
teyit veya çürütüldü. 20 ajan, 1097 araç çağrısı. Bu belge **denetim raporudur**; bu turda
kaynak kod değiştirilmemiştir.

**Soru:** Standart tam olarak uygulandı mı? Uygulama sonrası mantık hatası, sessiz bug veya
ileride sorun çıkaracak bulgu var mı?

---

## 0. Yönetici özeti

Koordinat standardının **çekirdek yön mantığı doğru uygulanmış**: motorda z=0 uzak yüz / z=length referans kapı ayrımı, LIFO bölge dağıtımı (`LifoPlacement.cs:83`), köşe (min x,y,z) semantiği, aynalama/telafi dönüşümü olmaması ve golden snapshot'ların yeni yönle yeniden üretilmiş olması bağımsız olarak doğrulandı. `PERS-04` (kayıtlı `PositionZ`'lerin ters kaldığı iddiası) ve `PERS-07` (mm→cm ölçek migration'ı gerektiği iddiası) kod kanıtıyla **çürütüldü**; `FE-UI-14` de backend doğrulaması tarafından kesildiği için elendi.

Gerçek risk üç yerde toplanıyor:

1. **Geçiş yalnızca yazma yolunda tamamlandı.** `doors` listesi kaydediliyor ama iki okuma sözleşmesi (`SharePlanDto`, `VehicleInPlanDto`) ve `DuplicateVehicle` yolu hâlâ tekil `LoadingType` üzerinde; sonuç sessiz kapı kaybı ve — kopyalama yolunda — yanlış başlangıç köşesi.
2. **`fillFromMaxX` (aynalanmış x) yolu kısmen uygulandı ve hiç test edilmiyor.** `OptimizationEngine.cs:65` LIFO bölge tohumlarını `x=0`'a sabitliyor; bu tohumlar aynalanmış modda **her yönelim için eleniyor**, yani üretimde LIFO bölge disiplini sessizce ölü. Golden/invariant senaryolarının hiçbiri bu bayrağı geçmiyor.
3. **`apps/algorithm-test-ui` bu branch'te yeni eklendi ama eski koordinat modelinden kopyalandı.** LIFO ayna doğrulaması z'yi **ters** kuruyor, birim testi bu ters yönü kilitliyor ve golden cross-check `Depth`/`Length` alan adı uyuşmazlığı yüzünden tüm Z tabanlı kuralları `NaN` ile "pass" veriyor — yani doğrulama aracının kendisi ölü.

Ayrıca koordinatla ilgisiz ama yüksek etkili üç hata: PDF yükleme listesinde ağırlık `N²` ile çarpılıyor, plan sihirbazı modalinde araç tipi enum'u ters eşlenmiş, arşivle/sil akışı kayıtlı aracın ölçülerini birim ayarına göre yeniden çevirip bozuyor.

Toplam: **13 high, 30 medium, ~27 low** (tekilleştirme sonrası). 3 bulgu çürütüldü.

---

## 1. Bulgu tablosu

| Kod | Dosya:satır | Sev | Kategori | Özet | Verdict |
|---|---|---|---|---|---|
| S-01 | `SharePlanDto.cs:3-8` + `ShareLinkRepository.cs:28-34,83-88,176-183` + `share.ts:47` + `SharePage.tsx:61` | high | yarım geçiş / sessiz varsayılan | Public share hâlâ `DoorDirection` dönüyor, frontend `doors` bekliyor → her paylaşılan plan `[Small@LengthZ]` varsayımına düşüyor | CONFIRMED (PERS-01, BDC-02, FT-01, SCENE-02, FE-UI-01, TD-01) |
| S-02 | `VehicleInPlanDto.cs:10` + `LoadingPlanRepository.cs:193,255` + `loadingPlanMappers.ts:572` | high | sessiz veri kaybı | Plan detayı `Doors` taşımıyor; frontend kayıplı `loadingType` türetimine düşüyor, ikinci kapı kayboluyor | CONFIRMED (BDC-03, PERS-08, FT-02, SCENE-01, FE-UI-04) |
| S-03 | `DuplicateVehicleCommandHandler.cs:34-57` | high | sessiz veri kaybı / başlangıç köşesi | Kopyalama kapı listesini kopyalamıyor, `EnsureDoors` da çağırmıyor → kapısız araç; `FillFromMaxX=false` ile yükleme kapının dibinden başlıyor | CONFIRMED (BDC-01, PERS-02, ENG-M1) |
| S-04 | `OptimizationEngine.cs:65` (koşul 111-112) | high | yön hatası / yarım geçiş | LIFO bölge tohumları `x=0` sabit; `fillFromMaxX` modunda hepsi eleniyor, bölge tohumlaması sessizce devre dışı | CONFIRMED (ENG-01, TD-03) |
| S-05 | `algorithm-test-ui/.../verification/lifoZones.ts:8,36-42` | high | yön hatası | Doğrulama aynası z'yi ters diziyor (order 1 → z=0); backend kapıya (z=length) koyuyor | CONFIRMED (ATU-01) |
| S-06 | `.../verification/lifoZones.test.ts:26-37` | high | yanlış yönü kilitleyen test | Test "ilk inecek grup Z=0'a düşer" diye ters yönü sabitliyor | CONFIRMED (ATU-02) |
| S-07 | `.../verification/goldenCrossCheck.test.ts:83-94,164,226-232` | high | test boşluğu / sessiz NaN | Fixture `Length` yazıyor, test `Depth` okuyor → `depth: undefined` → overlap/bounds-Z/CoG/zone kuralları `NaN` ile hep "pass" | CONFIRMED (ATU-M1, ATU-M2) |
| S-08 | `PlanPdfDocument.tsx:353,359,445` | high | export hesap hatası | Grup ağırlığı biriktirildikten sonra bir kez daha `row.count` ile çarpılıyor (`N²·w`) | CONFIRMED (FG-01) |
| S-09 | `AddVehicleModal.tsx:75-79,126` | high | enum eşleme hatası | `kamposet:2 / konteyner:3` — backend `Container=2, Romork=3`; araç tipi kalıcı ters kaydediliyor | CONFIRMED (FE-UI-02) |
| S-10 | `VehicleBulkImportDialog.tsx:166-169,260-263` → `vehicleMappers.ts:363-372` | high | birim karışması | cm/kg etiketli şablon değerleri `buildCreateVehiclePayload` içinde kullanıcı birimiyle tekrar çarpılıyor | CONFIRMED (FE-UI-05) |
| S-11 | `useVehicles.ts:324-350, 352-375` | high | birim karışması + veri kaybı | Arşivle/sil tam-üstüne-yazan PUT: cm/kg değerler yeniden çevriliyor, `maxLayerCount` yanlış anahtar (layerCount→1), kingpin/aks alanları `null`'lanıyor | CONFIRMED (FE-UI-M1 high; FT-09, FT-M1, FE-UI-M2) |
| S-12 | `algorithm-test-ui/src/lib/api/vehicleMappers.ts:23-32,45` | high | yarım geçiş | Mapper `doors` alanını okumuyor, kapıyı tekil `loadingType`'tan türetiyor → uydurma fail / kaçırılan regresyon | CONFIRMED (ATU-03) |
| S-13 | `20260815222100_...cs:74-89` + `LoadingType.cs:3-8` + `UpdateVehicleCommandValidator.cs:44-45` + `vehicleMappers.ts:47-64` | high | geriye dönük uyumluluk | `SideBoth=3` enum'dan silindi, `Vehicles.LoadingType` kolonu normalize edilmedi; 3 değeri `IsInEnum` ile güncellenemez, frontend boş kapı listesi üretir | CONFIRMED (PERS-03 high; BDC-07, PERS-M2, FT-06, ATU-12, FE-UI-M3) |
| S-14 | `VolumeScoring.cs:42` | medium | köşe/merkez karışması | `vehicleWidth - ex` kutu genişliğini eklemiyor; aynalanmış modda terim yönelime bağlı, dar yönelimler kazanıyor | CONFIRMED (ENG-02) |
| S-15 | `UpdateVehicleCommandHandler.cs:55, 62-63` | medium | çift kaynak | `LoadingType` koşulsuz yazılıyor, `Doors` yalnızca gönderilirse; çapraz doğrulama yok, `EnsureDoors` geri düşmesi de yok | CONFIRMED (BDC-04, PERS-M1, TD-13, ENG-M2) |
| S-16 | `LoadingCorner.cs:27-36` + `OptimizationInput.cs:35` | medium | eksik geri uyum | `HasReferenceDoor` `bool?` olup `LoadingType`'a düşerken `FillFromMaxX` düz `bool` ve boş listede sessizce `false` | CONFIRMED (BDC-05) |
| S-17 | `OptimizationInput.cs:43` + `VehicleConfiguration.cs:129-130` | medium | çift kaynak | Aynı kararda iki kaynak: başlangıç köşesi doors'tan, bölge ayrımı gerekirse eski enum'dan; kolon hâlâ zorunlu, kısıt yok | PLAUSIBLE (ENG-03) / CONFIRMED (PERS-05) |
| S-18 | `usePlanStore.ts:104,139,171-175` | medium | başlangıç köşesi | `buildPlacements` `fillsFromMaxX`'i hiç okumuyor; big door x=0 iken bile x 0→width dolduruyor | CONFIRMED (FT-03, FG-M2) |
| S-19 | `usePlanStore.ts:98,101-102,115` | medium | mantık hatası | Cursor ve kümülatif ağırlık staging kutularını da sayıyor (`isStagingArea` filtresi yok) | CONFIRMED (FT-11) |
| S-20 | `CargoMeshInstanced.tsx:283-285, 1190-1196` | medium | sıra hatası | `buildLoadOrder`/`seqNo` staging kutularını içeriyor; araca giren ilk kutu 1 yerine N+1 numarası alıyor | CONFIRMED (SCENE-M1, SCENE-M2) |
| S-21 | `LoadingPlanDetailPage.tsx:392-394,438,440,466` | medium | birim karışması | cm³ değer "m³" etiketiyle gösteriliyor (ad `interior*Cm`'e çevrildi, aritmetik değil) | CONFIRMED (FT-04) |
| S-22 | `vehicleMappers.ts:85-91` (+377) | medium | sessiz veri kaybı | `loadingTypeFromDoors` listeyi tek değere indiriyor, boş listede `0` (Rear) uyduruyor | CONFIRMED (FT-05, FE-UI-04) |
| S-23 | `AddVehicleModal.tsx:82-88,118-133` + `useVehicles.ts:488-497,521` | medium | yarım geçiş | Plan sihirbazı `doors` göndermiyor; şemada alan yok, `.parse()` düşürür; "yan" sessizce `SideRight`e sabitleniyor | CONFIRMED (FT-07) / PLAUSIBLE (FE-UI-03, TD-12) |
| S-24 | `AddVehicleModal.tsx:125-131` | medium | birim karışması | Ölçüler `toCentimeters`/`toKilograms` olmadan cm varsayılarak gönderiliyor | CONFIRMED (FT-M2) |
| S-25 | `vehicleMappers.ts:379-394` (okuma: 176-181) | medium | birim karışması | Kingpin/aks alanları `*Mm` adına dönüşümsüz yazılıyor; form eki `{dimensionUnit}` gösteriyor | CONFIRMED (FT-10, FG-M4) |
| S-26 | `VehicleDoorsField.tsx:35-44,46-54,68-71` | medium | sessiz veri kaybı | Seçici Small/Big/both dışını modellemiyor; mevcut Top kapı ilk tıklamada siliniyor, top-only araçta hiçbir seçenek seçili değil | CONFIRMED (FE-UI-06, TD-14, FG-M3) |
| S-27 | `VehicleBulkImportDialog.tsx:131-147,170-172` | medium | sessiz varsayılan | Eski şablonun `Kapı Yönü` sütunu tanınmıyor → `?? 'arka'`; `side`/`rearAndSide`/`top` karşılığı yok | CONFIRMED (FE-UI-07) |
| S-28 | `VehiclePreviewPanel.tsx:74-77,78-80,82,158` | medium | birim karışması | Zaten görüntü birimindeki form değerleri bir kez daha `formatDimensionDisplay`/`formatWeightDisplay`'den geçiyor | CONFIRMED (FE-UI-08) |
| S-29 | `VehicleDimensionsFields.tsx:29-32,145-147` | medium | birim karışması | `calcVolume`'a cm yerine görüntü birimi veriliyor; mm'de hacim 1000× şişiyor | CONFIRMED (FE-UI-09) |
| S-30 | `ContainerMesh.tsx:178-179` | medium | yön hatası (regresyon) | Kanat dönme işaretleri z=0 yüzü içindi; kapı z=length'e taşındı, kanatlar kargonun içinden süpürüyor | CONFIRMED (SCENE-03) |
| S-31 | `sceneFilter.ts:26` (+ `sceneFilter.test.ts:34-43`) | medium | yön varsayımı | X-Ray filtresi z=0 (uzak yüz) tarafından soyuyor; kapı artık z=length, test yalnızca `depth→length` olarak mekanik yeniden adlandırılmış | PLAUSIBLE (SCENE-04 low) / CONFIRMED (FG-M1 medium, TD-20) — en yüksek severity alındı |
| S-32 | `exportVehiclesToExcel.ts:14-16,19` | medium | etiket hatası / round-trip | İç ölçüler "Dış Uzunluk/Genişlik/Yükseklik" diye yazılıyor; başlıklar ve kapı sözlüğü importer ile örtüşmüyor | CONFIRMED (FG-04) / PLAUSIBLE (FE-UI-13, FG-02) |
| S-33 | `calcCenterOfGravity.ts:111-115,125-130` | medium | modelleme hatası | "Ön/Arka Aks Yükü" kasa uçlarından hesaplanıyor; kingpin/axleB uzaklıkları hiç kullanılmıyor (~%8 sistematik sapma) | CONFIRMED (FG-05) |
| S-34 | `EngineScenario.cs:64-81` + `SnapshotPayload.cs:25-42` + `InvariantScenarioSource.cs:61-70` | medium | golden-master kapsam boşluğu | 16 snapshot'ın hiçbiri `FillFromMaxX`/`HasReferenceDoor` taşımıyor; yeni kapı türevli yol hiç kilitli değil | CONFIRMED (TD-02, ENG-06, BDC-M2) |
| S-35 | `features/planning/scene/CLAUDE.md:88` + `apps/frontend/.claude/CLAUDE.md:415` | medium | doküman iç çelişkisi | `alwaysApply` dosyaları "uygulanmayan tek kısım kapı modelidir" diyor; aynı sayfanın 86. satırı tersini söylüyor | CONFIRMED (SCENE-11, TD-07) |
| S-36 | `docs/COORDINATE_STANDARD.md:83,100-101,303-321` | medium | doküman bayatlığı | §4/§10 doors listesini ve top door'u "kodda yok" gösteriyor; §10 kendi içinde de çelişiyor | CONFIRMED (TD-04, TD-M1) |
| S-37 | `docs/coordinate-standard.html:328,333,341,343-344,361,459,561,583` | medium | doküman iç çelişkisi | Small door'u z=0'da, iki big door'u aynı anda mümkün gösteriyor; 691-693 uyarısı ve markdown §4 tersini söylüyor | CONFIRMED (TD-05) |
| S-38 | `algorithm-test-ui/src/lib/types/vehicle.ts:1-8,25` | medium | yasaklı kapı modeli | `DoorDirection = {Front, Rear, Side, Top}` canlı; `Front` ölü, `Side` x=0/x=width ayrımını yok ediyor | CONFIRMED (ATU-05) |
| S-39 | `algorithm-test-ui/src/lib/types/loadingPlan.ts:13,25-32` (+12 kullanım) | medium | terminoloji | Z uzantısı `depth`; `ROTATION_LABEL` kullanıcıya `(W,H,L)` gösteriyor | CONFIRMED (ATU-06) |
| S-40 | `PlacementCanvas2D.tsx:48,51,59,62` | medium | yanıltıcı arayüz | Eksen etiketi "Z derinlik — 0 arka kapı"; standartta z=0 uzak yüz | CONFIRMED (ATU-07) |
| S-41 | `PlacementCanvas2D.tsx:68` (tüketim 271-275, 318-323) | medium | çizim/hit-test hatası | `perpAscending:false` — kamera z=length'te olduğu için uzaktaki kutu yakındakini boyuyor, tıklama yanlış kutuyu seçiyor | CONFIRMED (ATU-08) |
| S-42 | `PlacementCanvas2D.tsx:41-50` (+`toY` 229-233) | medium | aynalama | "Üstten (Z×X)" aslında alttan bakış; +X ekranda aşağı artıyor, front paneliyle çelişiyor | CONFIRMED (ATU-09) |
| S-43 | `algorithm-test-ui/src/lib/api/vehicleMappers.ts:5-8,10-16` | medium | bilgi kaybı | "Yan kapı varyantları tek yöne iner" varsayımı `FillFromMaxX` ile geçersizleşti | CONFIRMED (ATU-10) |
| S-44 | `LifoPlacement.cs:77-83` | low | sınır/float | `vehicleLength - i*zoneSize` decimal kalıntısı; 250/3'te son bölge `ZStart = 1E-26`, sert bölge kısıtı sessizce yumuşak cezaya düşüyor | PLAUSIBLE (ENG-04) |
| S-45 | `LoadingCorner.cs:32-35` | low | ölü kod | `!atWidthX` koruması veri kısıtları gereği ulaşılamaz; yorumdaki geri-uyum vaadi karşılıksız | PLAUSIBLE (ENG-05) |
| S-46 | `OptimizationEngine.cs:103` | low | determinizm | Aday sıralamasındaki x eşitlik bozucusu yön-farkında değil; ayna simetrisi bozuluyor | CONFIRMED (ENG-08) |
| S-47 | `CreateVehicleCommandValidator.cs:47-50` (+Update) & `VehicleDoorRules.cs:13-18,24` | low | kural boşluğu | "Konteynerde üst yükleme olmaz" yalnızca eski enum'a bağlı; doors ile Container+Top geçiyor | CONFIRMED (BDC-06) |
| S-48 | `DoorType.cs:26` + `vehicle.ts:28,40-43` | low | sözleşme yüzeyi | `DoorFace.ZeroZ` enum'da ve zod'da geçerli, hiçbir tipte kullanılamaz — her zaman 400 | CONFIRMED (BDC-08) / PLAUSIBLE (FT-12, TD-22) |
| S-49 | `20260815222100_...cs:93-97` | low | down migration | `DropTable` öncesi kapı listesi enum'a indirgenmiyor (kolon zaten dolu olduğu için etki sınırlı) | PLAUSIBLE (PERS-06) |
| S-50 | `20260815222100_...cs:74-89` | low | backfill kapsamı | Silinmiş/taslak araçlara da kapı üretiliyor (`WHERE IsDeleted=0` yok); kapılar soft-delete edilmiyor | CONFIRMED (PERS-09) |
| S-51 | `useVehicles.ts:159-165` | low | zod sınır davranışı | `safeParse` başarısızlığında satır sessizce düşüyor (216-226'daki kardeş yol logluyor) | PLAUSIBLE (FT-08) |
| S-52 | `ContainerMesh.tsx:224-225` | low | yön hatası (önceden var) | Yan kapı kanatları içeri süpürüyor; 250° zaten fiziksel değil | CONFIRMED (SCENE-05) |
| S-53 | `ContainerMesh.tsx:93,117` | low | yön hatası (regresyon) | Izgara/çerçeve `-Z` ofseti kapı z=length'e taşınınca kargonun içine düşüyor | CONFIRMED (SCENE-06) |
| S-54 | `ContainerMesh.tsx:160,191` | low | aynalama (lafzen) | Sağ kanat `scale={[-1,1,1]}` — koordinat telafisi değil ama negatif determinantlı grup | PLAUSIBLE (SCENE-07) |
| S-55 | `ContainerMesh.tsx:260,266-267` | low | yön hatası | Üst kapı yan kapının 250°'sini kullanıyor; kanatlar tavanın ~5,6 m altına iniyor | CONFIRMED (SCENE-08) |
| S-56 | `ContainerMesh.tsx:344` vs `useLoadingAnimation.ts:128-132` | low | yarım geçiş | Boş doors'ta mesh hiç kapı çizmiyor ama animasyon referans kapı varsayıp kapalı duvardan giriyor | CONFIRMED (SCENE-09) |
| S-57 | `useLoadingAnimation.ts:70,145` | low | sessiz bug | `doors = []` varsayılanı her render yeni dizi; effect bağımlılığında olduğu için animasyon sıfırlanıyor | CONFIRMED (SCENE-10) |
| S-58 | `CameraPresetButtons.tsx:29` + `scene-config.ts:107-108` | low | yanıltıcı ikon | `DoorOpen` ikonu kamerayı kapısız uzak yüze götüren FRONT preset'inde | CONFIRMED (SCENE-13) |
| S-59 | `boxOrientations.ts:20-21,38-45` (+test 62,66,109-110) | low | terminoloji/tutarsızlık | idx2/idx3 "ön/arka yüz" etiketleri ile `allowFaceFront/Back` eşlemesi tanımsız; bugün etkisiz (`allowFace*` her yerde `true`) | PLAUSIBLE (FG-03) |
| S-60 | `LandingPage.tsx:239-241,334-338,451` | low | sözleşme ihlali (izole) | Pazarlama demosu Z-up + merkezlenmiş origin + `CW/2 - ay` aynalaması kullanıyor | PLAUSIBLE (FE-UI-10) |
| S-61 | `VehiclePreview3D.tsx:36,465-472,501` | low | ölü prop | `kingpinDistance` geçiliyor ama okunmuyor; king pimi sabit orandan çiziliyor | CONFIRMED (FE-UI-15) |
| S-62 | `LifoGoldenMasterTests.cs:60-70` + `Snapshots/Lifo_YanKapi_BolgeUygulanmaz.json:9` | low | eski modeli kilitleyen ad | "Yan kapı → bölge yok" adı yeni kuralla (`HasReferenceDoor`) çelişiyor | CONFIRMED (TD-09) |
| S-63 | `GroupZoneTests.cs:45-46` | low | kırılgan test | Bölge sınırları üretim fonksiyonundan okunmak yerine elle kopyalanmış | CONFIRMED (TD-10) |
| S-64 | `vehicleMappers.test.ts:151-158` | low | yanıltıcı test adı | "Round-trip korunur" testi kaybın oluştuğu yolu geçmiyor (kayıplı yol :127-130'da ayrıca test ediliyor) | PLAUSIBLE (TD-11) |
| S-65 | `vehicle.ts:120-122` vs `LoadingCorner.cs:32-35` | low | FE/BE sözleşme farkı | Frontend ilk big door'a bakıyor, backend `atZeroX && !atWidthX`; bugün DB kısıtı nedeniyle erişilemez | PLAUSIBLE (TD-15) |
| S-66 | `algorithm-test-ui/.../vehicleMappers.ts:18-21` | low | sessiz varsayılan | Bilinmeyen/null `loadingType` sessizce `Rear`; `3: Side` ölü anahtar | CONFIRMED (ATU-04) |
| S-67 | `algorithm-test-ui/.../verification/types.ts:11-25` | low | test boşluğu | 13 kuralın hiçbiri yükleme yönünü veya başlangıç köşesini doğrulamıyor | CONFIRMED (ATU-11) |
| S-68 | `PlacementViewer.tsx:113`, `geometry.ts:5`, `loadingPlan.ts:2` | low | terminoloji | "sol-alt-arka köşe" / "bottom-left-rear" metinleri | CONFIRMED (ATU-13) |
| S-69 | `PlacementValidator.cs:267`, `OptimizationEngine.cs:237`, `BalanceScoring.cs:22`, `PhysicalInvariants.cs:16-17`, `BalanceSwapSupportTests.cs:30`, `OptimizationEngineOrientationTests.cs:11`, `scene-config.ts:95,67`, `usePlanStore.ts:107,203`, `checkOrientationFit.ts:27`, `geometry.ts:6`, `erpTerms.ts:25-26`, `BulkImportDialog.tsx:101`, `CargoMeshInstanced.tsx:282`, `useLoadingAnimation.ts:63`, `VehicleTable.tsx:329,357,768`, `boxOrientations.test.ts:51-53`, `NetsisProductFetcher.cs:126,142-144,157,334,340`, `Vehicle.cs:60`, `VehicleDoorTests.cs:66`, `loadingPlanMappers.ts:98` | low | terminoloji kalıntısı | `depth/derinlik/W,H,L/d`, "rear origin", yanlış indeks adı, bayat birim yorumu | CONFIRMED (ENG-07, FT-13, SCENE-12, FG-06, FG-07, FE-UI-11, FE-UI-12, TD-16, TD-21, TD-08, BDC-09, BDC-10/TD-17, BDC-M1) |
| S-70 | `KOORDINAT-UYUM-RAPORU.md:12-14,33`, `ALGORITMA.html:109,111,113,118,245,314,505`, `kod-taramasi-2026-08.md:120,122`, `doc-map.md:71-72`, `project-snapshot.md:32,37` | low | doküman bayatlığı | Kapanmış bulgular "açık", var olmayan kod satırları alıntı, satır/dosya sayıları yanlış | CONFIRMED (TD-06, TD-18, TD-19, TD-M2/M3/M4) |

**Elenen (REFUTED):** `PERS-04` (LIFO z ters çevrilmedi — sıralama ve formül birlikte çevrildiği için net etki sıfır), `PERS-07` (kullanıcı araçları main'de de cm kaydediliyordu; mm veri kümesi yalnızca silinen demo seed'di), `FE-UI-14` (boş `doors` backend validator'ında 400 ile kesiliyor).

---

## 2. Yüksek öncelikli bulgular

### S-01 — Public share sözleşmesi kapı listesini hiç taşımıyor
**Kanıt:** `SharePlanDto.cs:3-8` = `ShareVehicleDataDto(Width, Height, Length, string DoorDirection, string? VehicleType)` — `Doors` yok. `ShareLinkRepository.cs:87` `MapDoorDirection(vehicle.LoadingType)`, eşleme `:176-183` `SideRight or SideLeft => "side"`, `_ => "rear"`; sorgu `:28-34` `.ThenInclude(v => v.Doors)` yapmıyor. Frontend `share.ts:47` `doors` bekliyor, `doorDirection`'ı hiç okumuyor (`grep` boş), `SharePage.tsx:61` `vd.doors ?? [{Small, LengthZ}]`. Aynı dosyada `Depth → Length` yeniden adlandırılmış ama `DoorDirection`'a dokunulmamış — yarım geçiş kanıtı.
**Senaryo:** `doors=[{Big, ZeroX}]` aracın planı paylaşılır → `vd.doors` undefined → `[Small@LengthZ]` → `fillsFromMaxX()` false (`vehicle.ts:120`) → `loadOrder.ts:21` `xSign=+1`; gerçek plan `x=width`'ten başlamıştır. Public izleyici kapıyı z=length'te görür, yan kapı hiç çizilmez, `seqNo` etiketleri ters sırayı gösterir. Yerleşim koordinatları doğru döndüğü için hiçbir uyarı çıkmaz.
**Düzeltme:** `ShareVehicleDataDto`'ya `IReadOnlyList<VehicleDoorDto> Doors`, sorguya `.ThenInclude(v => v.Doors)`, `MapDoorDirection` + `DoorDirection` sil. Frontend fallback'i yalnızca gerçekten boş liste için bırak.

### S-02 — Plan detay DTO'su `Doors` taşımıyor
**Kanıt:** `VehicleInPlanDto.cs:5-14` yalnızca `LoadingType LoadingType` (:10); `LoadingPlanRepository.cs:193` `.Include(p => p.Vehicle)` (Doors yok), `:255` `plan.Vehicle.LoadingType`. Frontend `loadingPlanMappers.ts:389,572` `resolveDoors(v.doors, v.loadingType)` → `vehicleMappers.ts:70-76` kayıplı türetime düşer. Karşıt örnek: `VehicleDetailDto.cs:35` ve `VehicleSummaryDto.cs:32` `Doors` taşıyor.
**Senaryo:** `doors=[Small@LengthZ, Big@ZeroX]` → kayıtta `loadingType=2` → plan detayında `[Big@ZeroX]` türetilir. Araç listesinde "Arka + Yan (sol)" yazan araç, planlayıcıda arka kapısı olmayan araç olarak çizilir; `ContainerMesh` referans kapı meshi üretmez, `PlanRightPanel.tsx:180` kapı özetinden "arka kapı" düşer. Yerleşim geometrisi backend'de doğru kapı listesiyle hesaplandığı için plan verisi bozulmaz — kayıp görselleştirme ve LIFO göstergesi düzeyinde.
**Düzeltme:** `VehicleInPlanDto`'ya `Doors` ekle, sorguya `.ThenInclude(v => v.Doors)`, `MapToDetailDto`'da doldur. Frontend'te plan yolundaki `loadingType` fallback'ini kaldır.

### S-03 — `DuplicateVehicle` kapı listesini kopyalamıyor
**Kanıt:** `DuplicateVehicleCommandHandler.cs:34-54` 16 alanı tek tek kopyalıyor (`loadingType: source.LoadingType` :53), `:56-57` `Add` + `SaveChanges`. Dosyada `Doors`/`ReplaceDoors`/`DoorSetFactory` hiç geçmiyor. Kaynak araç kapılarıyla yüklü geliyor (`VehicleRepository.cs:76` `.Include(v => v.Doors)`). `CreateVehicleCommandHandler.cs:98-101` iki yolu da uyguluyor; kopyalama yolunda ikisi de yok. DB'de "en az bir kapı" kısıtı yok (`VehicleDoorConfiguration.cs:15-19,50-53` yalnızca tip-yüz ve tek-kapı-tipi). Endpoint canlı: `VehiclesController.cs:255`.
**Senaryo:** `doors=[Big@ZeroX]` (SideLeft) araç kopyalanır → kopyada `VehicleDoors` satırı yok → `CreatePlanCommandHandler.cs:262` `LoadingCorner.FillFromMaxX([])` = false (`LoadingCorner.cs:29-30`) ve `FillFromMaxX` için `LoadingType`'a düşen `??` yolu yok → yükleme `(0,0,0)`'dan, yani big door'un tam önünden başlar. Standart §7 `(width,0,0)` diyor. Frontend `resolveDoors` boş listede `doorsFromLoadingType(2)` ile kapıyı **doğru** gösterdiği için ayrışma görünmez.
**Düzeltme:** `duplicate.ReplaceDoors(source.Doors.Select(d => (d.Type, d.Face)))`; kaynak boşsa `DoorSetFactory.EnsureDoors(duplicate)`.

### S-04 — LIFO bölge tohumları `fillFromMaxX` modunda ölü
**Kanıt:** `OptimizationEngine.cs:47` `var startX = fillFromMaxX ? input.VehicleWidth : 0m;` ve :48/:54 bunu kullanıyor; ama `:65` `foreach (var zoneStart in groupZones.Values.Select(z => z.ZStart).Where(z => z > 0m)) extremePoints.Add((0m, 0m, zoneStart));` x'i sabit `0m` yapıyor. `:111-112` `var ex = fillFromMaxX ? ax - width : ax; if (ex < 0m) continue;` — `ax=0`, `width>0` → **her yönelim için** elenir. `:181-182` kalanları zaten siliyor. Tohumun gerekçesi `:60-63` yorumunda yazılı ("her grup Z=0'a yığılıyordu"). Kombinasyon ulaşılabilir: `VehicleDoorRules.cs:31-35` yalnızca aynı tipten iki kapıyı yasaklıyor, `Small@LengthZ + Big@ZeroX` serbest ve `VehicleDoorsField.tsx:27` "Küçük ve büyük kapı" + "Sol" ile doğrudan seçilebiliyor. Bu araçlarda `HasReferenceDoor=true` **ve** `FillFromMaxX=true` birlikte oluşuyor.
**Senaryo:** Lifo, 3 grup, length=300, zoneSize=100. `fillFromMaxX=false` iken snapshot'taki gibi grup3 Z=0/40, grup2 Z=100/140, grup1 Z=200/240. `true` iken 100 ve 200 tohumları elenir; grup2'nin tek adayı grup3'ün bittiği Z=80 olur, `IsInsideZone` false döner, `bestInZone` null kalır ve kutu cezalı yedek kademeyle Z=80'e yerleşir → gruplar iç içe girer, LIFO boşaltma sırası bozulur. Derleme ve tüm testler geçer.
**Düzeltme:** `extremePoints.Add((startX, 0m, zoneStart));` ve `extremePoints` içindeki x'in aynalanmış modda "sağ kenar" anlamına geldiğini tek bir yardımcıda merkezileştir. Regresyon testi: Lifo + `fillFromMaxX=true` + 3 grup.

### S-05 / S-06 — `algorithm-test-ui` LIFO aynası ters ve test bunu kilitliyor
**Kanıt:** `lifoZones.ts:8` "Arka kapı Z=0'dadır … kapıya en yakın (en küçük Z)"; `:38-42` `zStart: index*zoneSize, zEnd: (index+1)*zoneSize` → order 1 = `[0,100]`. Backend `LifoPlacement.cs:83` `(vehicleLength - (i+1)*zoneSize, vehicleLength - i*zoneSize)` → order 1 = `[200,300]`. Golden fixture `Lifo_UcGrup_ArkaKapi_BolgeSirasiKorunur.json`: order-1 kutuları Z=200 ve Z=240, order-3 kutuları Z=0 ve Z=40. `lifoZones.test.ts:32,35-36` bu ters yönü açıkça sabitliyor.
**Senaryo:** Kusursuz bir LIFO planı için istemci 6 kutunun 4'ünü "bölge dışı", toplam 680 cm taşma raporlar; `checkLifoZone` her doğru koşuda `fail`, `criteriaEffectiveness` "ortalama bölge taşması 680 cm" yazar. Ters yönde gerçekten bozuk bir plan 0 cm ile temiz görünür. `S-05` düzeltildiğinde `S-06` kırılır ve "düzeltme yanlış" sanılır — ikisi aynı PR'da gitmeli.
**Düzeltme:** `zStart: vehicleLength - (index+1)*zoneSize, zEnd: vehicleLength - index*zoneSize`; testi `[1,2]/300` için order1 `{150,300}`, order2 `{0,150}` olacak şekilde güncelle.

### S-07 — Golden cross-check `Depth` okuyor, fixture `Length` yazıyor → tüm Z kuralları NaN
**Kanıt:** `goldenCrossCheck.test.ts:83-94` `interface SnapshotPlacement { … Depth: number; … }` ve `:164` `depth: p.Depth`. Fixture kaydı `SnapshotPayload.cs:85-92` `(… Width, Height, Length, Rotation, Weight)`, `:103` `placement.Length` yazıyor; `grep -l '"Depth"' Snapshots/*.json` → 0 dosya. JSON `as Snapshot` ile cast edildiği için TS uyarmıyor.
**Senaryo:** Her yerleştirme `depth: undefined` ile giriyor. `geometry.ts:14-15` `a.positionZ < b.positionZ + b.depth` → NaN → false ⇒ `checkOverlap` hiçbir çakışmayı göremez; `checks.ts:128` Z taşmasını göremez; `checks.ts:478` `moment.z` NaN → `checkCogMismatch` `NaN > threshold` = false ile hep "pass"; `lifoZones.ts:56,90` taşmayı 0 cm raporlar. Yani S-05'in ters aynası 16 snapshot'ın hiçbirinde görünmüyor ve `:226-232` "sert kuralların hiçbiri ihlal edilmemiş" yeşil dönüyor.
**Düzeltme:** `Depth` → `Length` (S-39 ile birlikte `Placement.depth` → `length`), JSON cast'i zod ile parse'a çevir; `Lifo_*` fixture'ları için `zoneOverflow === 0` assertion'ı ekle.

### S-08 — PDF yükleme listesinde ağırlık `N²` ile çarpılıyor
**Kanıt:** `PlanPdfDocument.tsx:341-344` `totalWeight` placement başına `item.weight` topluyor (birim ağırlık); `:353` `existing.weight += item?.weight ?? 0` ile N kez biriktiriliyor, ilk kayıt `:359` `weight: item?.weight ?? 0`; render `:445` `{(row.weight * row.count).toFixed(1)}` → `N²·w`.
**Senaryo:** 5 kg × 10 adet → "Plan Özeti / Toplam Ağırlık" 50.0 kg, "Yükleme Listesi" satırı 500.0 kg. Tek adetli üründe hata görünmez. `exportPlanToPdf.test.ts:15-17` bileşeni `() => null` ile mock'ladığı için test yakalamıyor.
**Düzeltme:** `:445` → `{row.weight.toFixed(1)}`. `totalWeight` ile grup toplamının eşitliğini doğrulayan birim testi ekle. (Koordinat geçişiyle ilgisiz, main'de de var — ama imzalı müşteri belgesi.)

### S-09 — Plan sihirbazı modalinde araç tipi enum'u ters
**Kanıt:** `AddVehicleModal.tsx:75-79` `{ tir:0, kamyon:1, kamposet:2, konteyner:3 }`, kullanımı `:126`. `VehicleType.cs:3-8` `Trailer=0, Truck=1, Container=2, Romork=3`. Doğru eşleme zaten var: `vehicleMappers.ts:21-26` `{ Tir:0, Kamyon:1, Konteyner:2, Kamposet:3 }`. Dosya bu branch'te yeni eklendi.
**Senaryo:** "Kamposet" seçilir → `vehicleType=2` gider → DB'de Container. Araçlar listesinde "Konteyner" görünür, plaka `serialNumber`'a kayar (`vehicleMappers.ts:210-211`), `VehiclePreview3D` kabin/king pimi çizmez.
**Düzeltme:** Yerel `FORM_VEHICLE_TYPE_INT`'i sil, `VEHICLE_TYPE_INT`'i `@/lib/api/vehicleMappers`'tan import et.

### S-10 — Araç toplu import'ta çift birim dönüşümü
**Kanıt:** `VehicleBulkImportDialog.tsx:166-169` cm/kg etiketli başlıkları okuyor, `:260-263` ham sayıları `createVehicle.mutate`'e veriyor; `useVehicles.ts:257-261` → `buildCreateVehiclePayload` → `vehicleMappers.ts:352` `useUnitStore.getState()` + `:363-372` `toCentimeters/toKilograms`. `TO_CM.mm=0.1`, `TO_KG.ton=1000`. Ürün tarafı (`BulkImportDialog.tsx:87-120`) bu dönüşümü bilinçli atlıyor — yol tutarsız.
**Senaryo:** mm+ton ayarlı kullanıcı şablonu (1360/240/270/26000) olduğu gibi yükler → araç 136×24×27 cm, kapasite 26.000.000 kg. Backend yalnızca `>0` istediği için sessizce kabul edilir.
**Düzeltme:** Toplu import satırlarını cm/kg sabit kabul eden bir yol (ör. `buildCreateVehiclePayload`'a `unit` parametresi ya da doğrudan `CreateVehicleRequest`).

### S-11 — Arşivle/sil PUT'u kayıtlı aracı bozuyor (üç ayrı hata)
**Kanıt:** `useVehicles.ts:324-350` ve `:352-375` `Vehicle` alanlarını (cm/kg) `buildCreateVehiclePayload`'a `VehicleFormValues` gibi veriyor: **(a)** `:363-372` bunları birim ayarına göre yeniden çeviriyor; **(b)** `:340`/`:369` `maxLayerCount` anahtarını kullanıyor, şema alanı `layerCount` — `vehicleMappers.ts:373` `undefined` görüp daima `1` gönderiyor; **(c)** payload `kingpin`/`axleB`/`axles` taşımadığı için `:379-394` tüm `kingPin*/mainAxle*/additionalAxle*` alanlarını `null` yazıyor. `UpdateVehicleCommandHandler.cs:36-57` → `Vehicle.Update` bunları koşulsuz uyguluyor (patch semantiği yok).
**Senaryo:** mm+ton ayarlı kullanıcı 1360×248×270 cm / 26000 kg dorseyi arşivler → 136×24.8×27 cm, 26.000.000 kg, `LayerCount=1`, kingpin/aks NULL. Hiçbir hata görünmez, geri aktifleştirilse de veri geri gelmez.
**Düzeltme:** Arşiv/sil için minimal payload (yalnızca `isActive`/`isDraft`) veya dönüşümsüz `buildUpdateVehiclePayloadFromVehicle(vehicle)`; `as VehicleFormValues` cast'ini kaldırıp tip kontrolünü aç.

### S-12 — `algorithm-test-ui` mapper'ı `doors` alanını hiç okumuyor
**Kanıt:** `vehicleListApiItemSchema` (`:23-32`) yalnızca `loadingType`; `:45` `doorDirection: resolveDoorDirection(api.loadingType)`. Oysa `VehicleSummaryDto.cs:32` `Doors` dönüyor ve motor kararı `CreatePlanCommandHandler.cs:262-263` + `OptimizationInput.cs:43` doors'tan geliyor. İki alan bağımsız yazılıyor (`UpdateVehicleCommandHandler.cs:62-63`), yani ayrışma sıradan araç formundan üretilebiliyor.
**Senaryo:** `doors=[Small@LengthZ, Big@ZeroX]` → `loadingTypeFromDoors` = 2 → backend `HasReferenceDoor=true` (bölgeler açık), istemci `Side` görüp `zones=[]` üretir → `checkLifoZone` "skipped", gerçek bölge regresyonu hiç ölçülmez. Tersi durumda uydurma `fail`.
**Düzeltme:** Şemaya `doors` ekle, `Vehicle` tipinde `doorDirection` yerine `doors: VehicleDoor[]` tut, bölge kapısını `LoadingCorner.HasReferenceDoor` aynasıyla kur (S-38/S-43 ile birlikte).

### S-13 — `SideBoth = 3` enum'dan silindi, kolon normalize edilmedi
**Kanıt:** `LoadingType.cs` artık `Rear=0, SideRight=1, SideLeft=2, Top=4`; `git show main:` ile `SideBoth=3`'ün silindiği doğrulandı. Kolon `int` kalıyor (`AddVehicleModel.cs:45`). Backfill `20260815222100:84` `… WHERE v.[LoadingType] IN (1, 3)` ile yalnızca kapı satırı üretiyor, `UPDATE [Vehicles] SET [LoadingType]` hiçbir migration'da yok. Değer 3 üretimde bulunabilir: main frontend'inde `vehicle.ts:16 RearAndSide: 'rearAndSide'` seçilebilirdi.
**Senaryo:** `LoadingType=3` kalmış araç → `UpdateVehicleCommandValidator.cs:44-45` `IsInEnum()` ile 400 "Geçersiz yükleme tipi" (API üzerinden güncellenemez); `ShareLinkRepository.cs:182` `_ => "rear"`; `vehicleMappers.ts:56-62` boş dizi + warn → plan ekranında araç kapısız çizilir, aynı araç listede backfill sayesinde "Yan (sağ)" görünür. Frontend `loadingTypeFromDoors` ile ilk kayıtta kendini düzelttiği için etki sınırlı ama kolonda tanımsız enum kalıcı.
**Düzeltme:** Backfill'e (veya yeni bir migration'a) `UPDATE [Vehicles] SET [LoadingType] = 1 WHERE [LoadingType] = 3;` ekle — backfill'in kendi `3 → Big@WidthX` seçimiyle tutarlı. Ölü `3` anahtarlarını (`vehicleMappers.ts:47-52`, `goldenCrossCheck.test.ts:38-44`, `AddVehicleModal.tsx:82`) temizle.

---

## 3. Orta ve düşük öncelikli bulgular

**Motor (medium):** `S-14` `VolumeScoring.cs:42` — aynalanmış modda genişlik terimi `vehicleWidth - ex` kutu genişliğini eklemiyor; `ex` min-x köşesi olduğu için terim yönelime bağlı hale geliyor ve Lifo'da (denge terimi 0) dar yönelim kazanıyor. Düzeltme: `vehicleWidth - (ex + boxWidth)`, `width` zaten `ComputeScore` imzasında var.

**Çift kaynak ailesi (medium):** `S-15` (`UpdateVehicleCommandHandler.cs:55,62-63` — `LoadingType` koşulsuz, `Doors` koşullu, `EnsureDoors` geri düşmesi yok), `S-16` (`LoadingCorner.cs:29-30` boş listede `false`, `HasReferenceDoor`'un aksine `LoadingType`'a düşmüyor), `S-17` (`OptimizationInput.cs:43` + `VehicleConfiguration.cs:129-130` — kolon hâlâ zorunlu, validator'larda çapraz kontrol yok). Ortak düzeltme: `LoadingType`'ı ya doors'tan türetilmiş hale getir ya da validator'a `loadingTypeFromDoors(Doors) == LoadingType` kuralı ekle; `FillFromMaxX`'i `bool?` yapıp `?? (LoadingType == SideLeft)` ile eşle.

**Frontend plan/mağaza (medium):** `S-18` `buildPlacements` `fillsFromMaxX`'i hiç okumuyor (`fillsFromMaxX` tüm uygulamada yalnızca `loadOrder.ts:21`'de kullanılıyor) — manuel yerleşim kapının dibinden başlıyor, animasyon ters yönde oynuyor. `S-19`/`S-20` staging kutuları: cursor `curZ_init=400`'den başlıyor, ağırlık limiti erken doluyor, `seqNo` kayıyor; `CameraPresetButtons.tsx:79` zaten doğru filtreyi uyguluyor.

**Birim sınırı (medium):** `S-21` (cm³ "m³"), `S-24` (`AddVehicleModal` dönüşümsüz), `S-25` (kingpin/aks `*Mm` adına cm yazılıyor; `VehiclePreview3D.tsx:506,529-532` bu değeri cm gibi kullanıyor), `S-28` (önizleme çift dönüşüm), `S-29` (`calcVolume`'a görüntü birimi), `S-32` (export "Dış" başlıkları + importer ile eşleşmeyen sözlük).

**Sahne yönü (medium/low):** `S-30` referans kapı kanatları içeri süpürüyor (gerçek regresyon: main'de `case 'rear'` z=0 için işaretler doğruydu); `S-53` ızgara/çerçeve `-Z` ofseti aynı nedenle içeri düştü; `S-52`/`S-55` yan ve üst kapı açıları (main ile özdeş, regresyon değil); `S-31` X-Ray filtresi z=0 tarafından soyuyor (kamera +Z'de); `S-56` boş doors'ta mesh ile animasyonun varsayımı ayrışıyor; `S-57` `doors=[]` varsayılanı effect'i her render sıfırlıyor; `S-54` `scale={[-1,1,1]}` lafzen yasak listede; `S-58` `DoorOpen` ikonu yanlış preset'te.

**Doğrulama aracı (medium):** `S-38`–`S-43` — `DoorDirection` enum'u, `depth` terimi, "Z derinlik — 0 arka kapı" etiketleri, `perpAscending:false` (uzak kutu yakındakini boyuyor + tıklama yanlış kutuyu seçiyor), "Üstten" görünümün aynalı olması, `Side` kolapsı. Bu altısı S-05/S-06/S-07/S-12 ile aynı kök nedene bağlı ve tek PR'da gitmeli.

**Test/doküman (medium):** `S-34` golden kapsam boşluğu (`FillFromMaxX`'i geçen tek test `YuklemeBaslangicKosesiTests.cs:81`; VolumeFirst + Fixed + tek katman), `S-35`/`S-36`/`S-37` — bkz. §5.

**Low tier özet:** `S-44` decimal bölge kalıntısı (250/3 → ZStart `1E-26`; testler 300 ve 1360 kullandığı için hiç görülmüyor), `S-45` ulaşılamaz `!atWidthX` koruması, `S-46` yön-farkında olmayan eşitlik bozucusu, `S-47` Container+Top boşluğu (`VehicleDoorRules.Validate` imzasında `VehicleType` yok), `S-48` `DoorFace.ZeroZ` sözleşmede ama hiçbir tipte geçerli değil, `S-49`/`S-50` migration hijyeni, `S-51` sessiz zod satır düşürme, `S-59` `boxOrientations` ön/arka etiket belirsizliği (bugün etkisiz — `allowFace*` her yerde `true`), `S-60` LandingPage demosu (izole, plan verisi tüketmiyor), `S-61` ölü `kingpinDistance` prop'u, `S-62`–`S-65` test adlandırma/kırılganlık, `S-66`–`S-68` araç içi kalıntılar, `S-69`/`S-70` terminoloji ve doküman bayatlıkları.

---

## 4. Kök nedenler

**KN-1 — Geçiş yalnızca yazma yolunda tamamlandı; okuma sözleşmeleri ve yan yollar dışarıda kaldı.**
`doors` kaydediliyor ve motora doğru gidiyor, ama iki okuma DTO'su ile kopyalama yolu eski modelde. → `S-01, S-02, S-03, S-12, S-22, S-23, S-26, S-27`

**KN-2 — Tekil `LoadingType` ikinci kaynak olarak canlı ve iki alan hiçbir katmanda çapraz doğrulanmıyor.**
Kolon zorunlu, handler'lar birbirinden bağımsız yazıyor, validator'larda kural yok, `FillFromMaxX` ile `HasReferenceDoor` farklı geri-uyum semantiği taşıyor. → `S-13, S-15, S-16, S-17, S-22, S-27, S-47, S-66`

**KN-3 — `fillFromMaxX` (aynalanmış x) yolu kısmen uygulandı ve hiçbir golden/invariant senaryosu bu bayrağı geçmiyor.**
Kod içinde yönü dikkate alan noktalar (47, 54, 111, 181) ile almayan noktalar (65, 103, `VolumeScoring:42`) yan yana; test kapsamı tek bir VolumeFirst senaryosuyla sınırlı. → `S-04, S-14, S-18, S-34, S-45, S-46, S-65, S-67`

**KN-4 — `apps/algorithm-test-ui` geçiş sırasında eklendi ama eski koordinat modelinden kopyalandı; kendi golden kapısı alan adı uyuşmazlığı yüzünden ölü.**
Doğrulama aracı hem yanlış yönü uyguluyor hem de kendi hatasını göremiyor. → `S-05, S-06, S-07, S-12, S-38, S-39, S-40, S-41, S-42, S-43, S-66, S-67, S-68`

**KN-5 — Birim dönüşümü tek bir sınırda değil; form, mapper, import, önizleme ve modal kendi çevrimini yapıyor.**
`buildCreateVehiclePayload` hem "form değeri" hem "kayıtlı değer" girdileriyle çağrılıyor; bazı alanlar (kingpin/aks) hiç çevrilmiyor, bazıları iki kez çevriliyor. → `S-10, S-11, S-21, S-24, S-25, S-28, S-29, S-32`

**KN-6 — Referans kapı z=0'dan z=length'e taşındı ama ona bağlı görsel/filtre/etiket türevleri ve dokümanlar birlikte türetilmedi.**
Kapı meshi taşındı, kanat/ızgara işaretleri ve kesit filtresi taşınmadı; kural dosyaları ile standart hâlâ geçiş öncesini anlatıyor. → `S-30, S-31, S-35, S-36, S-37, S-40, S-52, S-53, S-55, S-56, S-58, S-69, S-70`

---

## 5. Standardın iç çelişkileri ve doküman bayatlıkları

1. **`docs/COORDINATE_STANDARD.md` kendi içinde çelişiyor.** `:303-305` "aşağıdaki 2 ve 3 numaralı kararlar kodda henüz uygulanmamıştır" derken `:311` 3 numaralı satırı "✅ uygulandı" diyor; `:320-321` aynı yanlışı tekrarlıyor. `:317` `LoadingType` enum'unu `Rear/SideRight/SideLeft/SideBoth/Top` diye sayıyor — `SideBoth` bu branch'te silindi. `:83`, `:100-101` ve `:310` doors listesini ve top door'u "kodda yok" gösteriyor; ikisi de uygulanmış (`DoorType.cs`, `VehicleDoorRules.cs:16`, `VehicleDoors` tablosu, `vehicle.ts:21,36`). `:318` `ComputeGroupZones`'un yalnız `LoadingType.Rear` için bölge ürettiğini söylüyor; kod `bool zonesApply` alıyor (`LifoPlacement.cs:56,64`).
2. **`docs/coordinate-standard.html` markdown ile ve kendisiyle çelişiyor.** `:328,333` small door'u "z=length ve/veya z=0, iki uçta da olabilir"; `:341,343-344` big door'u "x=0 ve/veya x=width, iki tarafta olabilir"; `:583` "iki kısa yüzde de small door, iki uzun yüzde de big door bulunabilir" — oysa aynı dosyanın `:691-693` uyarısı ve markdown `:78`/`:249` "ikisi birden değil" ve "her tipten en fazla bir kapı" diyor. DB de tersini zorluyor (`CK_VehicleDoors_TipYuzEslesmesi`, `IX_VehicleDoors_TekKapiTipi`). `:349,360,801-802,816` ayrıca "kodda yok" rozetleri taşıyor.
3. **`apps/frontend/src/features/planning/scene/CLAUDE.md` aynı sayfada çelişiyor.** `:86` "kapılar small/big + face listesidir" ↔ `:88` "uygulanmayan tek kısım kapı modelidir (`doors` listesi, `top door`, `clearanceCm`)". Aynı cümle `apps/frontend/.claude/CLAUDE.md:415`'te. Dosya `alwaysApply: true`, yani her sahne görevinde bağlama giriyor. Ayrıca `clearanceCm` kavramı standardın §7'sinde iptal edilmiş.
4. **`docs/KOORDINAT-UYUM-RAPORU.md:12-14,33`** kapı modelini "51 bulgu açık" ve "`vehicle.ts:11` hâlâ `DoorDirection`" diye gösteriyor; `vehicle.ts:15-38` artık `DoorType`/`DoorFace` tanımlıyor. Belge kendini tarihlendiriyor (2026-08-15 ölçümü), yani mutlak yanlış değil ama bayat.
5. **`docs/context/kod-taramasi-2026-08.md`** iki satırı da kaymış: `:122` (OPT-10) artık var olmayan `loadingType != LoadingType.Rear` ifadesini alıntılıyor; `:120` (OPT-14) "satır değişmedi" diyor, gerçek konum `OptimizationEngine.cs:81`. `COORDINATE_STANDARD.md:318` bu kaydı kaynak gösterdiği için hata iki belgeye yayılmış.
6. **`docs/context/project-snapshot.md`** `:32` "`depth`/sol-alt-arka terminolojisi kaldırıldı" diyor (5 kaynak dosyada duruyor); `:37` motoru "7 dosya / 1036 satır" gösteriyor, gerçek 9 dosya / 1162 satır.
7. **`docs/context/doc-map.md:71-72`** satır sayıları (280/377) gerçek dosyalarla (321/385) uyuşmuyor ve §10 "Kodun bugünkü hâli" tablosunu yetkili kaynak gösteriyor — o tablo yanlış.
8. **`ALGORITMA.html`** (izlenmeyen dosya) `Z = Derinlik`, `sol-alt-arka köşe`, `kapı yönü (LoadingType)` ve `:505` "zone hesabı yalnızca `LoadingType.Rear`'ı tanıyor" diyor.
9. **Standardın kendi kapsam boşluğu:** `DoorFace.ZeroZ` hem backend hem frontend enum'unda ilan ediliyor ama hiçbir kapı tipi için geçerli değil (`S-48`); ve "konteynerde üst yükleme olmaz" kuralı yalnızca eski enum'a bağlı, doors modelinde karşılığı yok (`S-47`).

---

## 6. Önerilen düzeltme sırası (PR grupları)

| # | PR | İçerik | Neden birlikte |
|---|---|---|---|
| 1 | **Motor yön düzeltmesi + golden kapsam** | `S-04`, `S-14`, `S-46`, `S-34`, `S-45`, `S-44` | `S-04` üretimde sessizce yanlış plan üretiyor; `S-34` olmadan düzeltme doğrulanamaz. Aynı dosyalar (`OptimizationEngine`, `VolumeScoring`, `EngineScenario`, `SnapshotPayload`) — snapshot'lar tek seferde yenilenmeli. |
| 2 | **Kapı sözleşmesini tamamla** | `S-01`, `S-02`, `S-03` | Üçü de aynı eksiği (okuma yolunda `doors`) kapatıyor; `S-03` düzeltilmeden `S-02` hâlâ kapısız araç görebilir. Frontend fallback'lerinin kaldırılması bu PR'a bağlı. |
| 3 | **Tek kaynak + geriye uyum** | `S-13`, `S-15`, `S-16`, `S-17`, `S-22`, `S-47`, `S-48`, `S-66` | `LoadingType`'ın türetilmiş hale getirilmesi tek atomik karar; migration (`SideBoth` normalize) aynı PR'da gitmeli yoksa validator 400'leri sürer. |
| 4 | **`algorithm-test-ui` doğrulama aracını canlandır** | `S-07` → `S-05` → `S-06` → `S-12`, `S-38`–`S-43`, `S-39`, `S-66`–`S-68` | `S-07` düzeltilmeden `S-05`'in düzeldiğini kimse göremez; `S-05`/`S-06` ters yönü birlikte tutuyor, ayrı PR'da biri diğerini kırar. Bu grup üretimi etkilemiyor, paralel gidebilir. |
| 5 | **Birim sınırını tekilleştir** | `S-11`, `S-10`, `S-24`, `S-25`, `S-28`, `S-29`, `S-21`, `S-32` | Hepsi `buildCreateVehiclePayload`/`unitConversion` sınırında; ayrı ayrı düzeltmek yeni asimetri üretir. `S-11` kalıcı veri bozduğu için grubun başında. |
| 6 | **Plan sihirbazı + form kayıpları** | `S-09`, `S-23`, `S-26`, `S-27` | `S-09`, `S-23`, `S-24` aynı dosyada (`AddVehicleModal`); `S-26`/`S-27` kapı modelini forma/import'a tamamlıyor. |
| 7 | **Frontend yerleşim ve sıralama** | `S-18`, `S-19`, `S-20` | Üçü de `usePlanStore.buildPlacements`/`buildLoadOrder` girdisini düzeltiyor; ayrı gitse staging filtresi ile başlangıç köşesi çelişebilir. |
| 8 | **Sahne yön türevleri** | `S-30`, `S-53`, `S-31`, `S-56`, `S-57`, `S-52`, `S-55`, `S-54`, `S-58` | Hepsi `ContainerMesh`/`sceneFilter`/`useLoadingAnimation`; tek görsel QA turuyla doğrulanabilir. |
| 9 | **Export/rapor** | `S-08`, `S-33`, `S-32`(kalanı), `S-59`, `S-61` | Koordinattan bağımsız, düşük çakışma riski. `S-33`, `S-25` düzeltilmeden yapılmamalı (aks uzaklıkları birim tuzağı taşıyor). |
| 10 | **Doküman + terminoloji** | `S-35`, `S-36`, `S-37`, `S-69`, `S-70`, `S-62`, `S-63`, `S-64`, `S-65`, `S-49`, `S-50`, `S-51`, `S-60` | Son sırada, çünkü 1–9 tamamlandıktan sonra "kalan açık kalem" listesi netleşir; `S-35`/`S-36` yanlış bilgi yaydığı için bu PR'ın en geç 3. PR ile birlikte gitmesi tercih edilir. |

**Zorunlu birliktelikler:** (`S-05`+`S-06`), (`S-07` önce), (`S-13` migration + validator), (`S-01`+frontend fallback kaldırma), (`S-25`+`S-33`).

---

## 7. Doğrulama komutları (tek seferde çalıştırılacak)

```bash
cd /c/Users/ASUS/Desktop/divizyon/cargo-pilot-prod

# --- S-01: share DTO'sunda Doors var mı, DoorDirection gitti mi
rg -n "DoorDirection|Doors|ThenInclude" apps/backend/CargoPilot.Application/Features/Shares/GetSharePlanByToken/SharePlanDto.cs apps/backend/CargoPilot.Infrastructure/Persistence/Repositories/ShareLinkRepository.cs
# --- S-02: plan detay DTO'su + repository include
rg -n "Doors|LoadingType" apps/backend/CargoPilot.Application/Features/Plans/GetPlanById/VehicleInPlanDto.cs
rg -n "Include\(p => p.Vehicle" apps/backend/CargoPilot.Infrastructure/Persistence/Repositories/LoadingPlanRepository.cs
# --- S-03: duplicate handler kapıya dokunuyor mu (0 isabet = hata duruyor)
rg -n "Doors|ReplaceDoors|EnsureDoors" apps/backend/CargoPilot.Application/Features/Vehicles/DuplicateVehicle/DuplicateVehicleCommandHandler.cs
# --- S-04 / S-46: bölge tohumu ve sıralama yön-farkında mı
rg -n "extremePoints.Add|OrderBy\(p => p.y\)|startX" apps/backend/CargoPilot.Application/Common/Optimization/OptimizationEngine.cs
# --- S-14: WidthTerm imzası kutu genişliği alıyor mu
rg -n "WidthTerm" apps/backend/CargoPilot.Application/Common/Optimization/VolumeScoring.cs apps/backend/CargoPilot.Application/Common/Optimization/OptimizationEngine.cs
# --- S-13: SideBoth normalize migration'ı var mı (0 isabet = hata duruyor)
rg -n "SET \[LoadingType\]|LoadingType\] = 1" apps/backend/CargoPilot.Infrastructure/Persistence/Migrations/
# --- S-15/S-16/S-17: çift kaynak
rg -n "loadingType: request.LoadingType|request.Doors is not null|ZonesApply|FillFromMaxX" apps/backend/CargoPilot.Application/Features/Vehicles/UpdateVehicle/UpdateVehicleCommandHandler.cs apps/backend/CargoPilot.Application/Common/Models/OptimizationInput.cs apps/backend/CargoPilot.Application/Common/Optimization/LoadingCorner.cs
# --- S-34: golden senaryolar yeni alanları taşıyor mu (0 isabet = boşluk duruyor)
rg -n "FillFromMaxX|HasReferenceDoor" apps/backend/CargoPilot.Engine.Tests/ apps/backend/CargoPilot.Infrastructure.Tests/
# --- S-05/S-06: algorithm-test-ui LIFO yönü
rg -n "zStart|zEnd|Z=0|kapıya en yakın" apps/algorithm-test-ui/src/algorithm-test/verification/lifoZones.ts apps/algorithm-test-ui/src/algorithm-test/verification/lifoZones.test.ts
# --- S-07: Depth/Length uyuşmazlığı (fixture'da "Depth" 0 dosya olmalı)
rg -n "Depth" apps/algorithm-test-ui/src/algorithm-test/verification/goldenCrossCheck.test.ts; rg -l '"Depth"' apps/backend/CargoPilot.Engine.Tests/Snapshots/
# --- S-12/S-38/S-43: doors listesi ve DoorDirection kalıntısı
rg -n "doors|DoorDirection|resolveDoorDirection" apps/algorithm-test-ui/src/lib/api/vehicleMappers.ts apps/algorithm-test-ui/src/lib/types/vehicle.ts
# --- S-08: PDF ağırlık çarpımı
rg -n "row.weight|existing.weight" apps/frontend/src/features/planning/export/components/PlanPdfDocument.tsx
# --- S-09: araç tipi enum eşlemesi
rg -n "FORM_VEHICLE_TYPE_INT|VEHICLE_TYPE_INT" apps/frontend/src/features/planning/panels/components/AddVehicleModal.tsx apps/frontend/src/lib/api/vehicleMappers.ts
# --- S-10/S-11/S-24/S-25: birim sınırı
rg -n "buildCreateVehiclePayload|toCentimeters|toKilograms|maxLayerCount|kingPinDistanceMm" apps/frontend/src/lib/api/useVehicles.ts apps/frontend/src/lib/api/vehicleMappers.ts apps/frontend/src/features/planning/panels/components/AddVehicleModal.tsx
# --- S-18/S-19: başlangıç köşesi ve staging filtresi
rg -n "curX = 0|fillsFromMaxX|isStagingArea|!p.isViolation" apps/frontend/src/lib/store/usePlanStore.ts
rg -rn "fillsFromMaxX" apps/frontend/src --glob '!*.test.*'
# --- S-20: loadOrder/seqNo staging içeriyor mu
rg -n "buildLoadOrder|seqIdx \+ 1|isStagingArea" apps/frontend/src/features/planning/scene/components/CargoMeshInstanced.tsx
# --- S-21: cm³ / m³
rg -n "interiorWidthCm|m³" apps/frontend/src/pages/plans/LoadingPlanDetailPage.tsx
# --- S-26/S-27: Top kapı ve import sözlüğü
rg -n "DoorType.Top|buildDoors|resolveSetKey" apps/frontend/src/features/data-management/vehicles/components/VehicleDoorsField.tsx
rg -n "DOOR_SET_ALIASES|Kapılar|Kapı Yönü" apps/frontend/src/features/data-management/imports/components/VehicleBulkImportDialog.tsx
# --- S-30/S-31/S-53: sahne yönü
rg -n "rotation.y = angleRef|DOOR_THICKNESS \+ 0.5|position=\{\[0, 0, length\]\}" apps/frontend/src/features/planning/scene/components/ContainerMesh.tsx
rg -n "positionZ < activeLayer" apps/frontend/src/lib/utils/scene/sceneFilter.ts
# --- S-69: yasaklı terim taraması (0 isabet hedef)
rg -rn --glob '!**/locales/**' -e '\bdepth\b' -e 'derinlik' -e 'bottom-left-rear' -e 'sol-alt-arka' -e 'STAGING_DEPTH_CM' -e 'DOOR_REAR_OPEN_ANGLE' apps/frontend/src apps/algorithm-test-ui/src apps/backend/CargoPilot.Application apps/backend/CargoPilot.Engine.Tests
# --- S-35/S-36/S-37: doküman çelişkileri
rg -n "uygulanmadı|uygulanmayan tek kısım|SideBoth|ve/veya" docs/COORDINATE_STANDARD.md docs/coordinate-standard.html apps/frontend/src/features/planning/scene/CLAUDE.md apps/frontend/.claude/CLAUDE.md
# --- S-48: ZeroZ sözleşme yüzeyi
rg -n "ZeroZ" apps/backend/CargoPilot.Domain/Enums/DoorFace.cs apps/frontend/src/lib/types/vehicle.ts

# --- Dar test kümesi (yön ve kapı davranışını kilitleyenler)
dotnet test apps/backend/CargoPilot.Engine.Tests --filter "FullyQualifiedName~Lifo"
dotnet test apps/backend/CargoPilot.Infrastructure.Tests --filter "FullyQualifiedName~YuklemeBaslangicKosesi|FullyQualifiedName~GroupZone|FullyQualifiedName~LifoBolgeKisiti"
dotnet test apps/backend/tests/CargoPilot.Application.Tests --filter "FullyQualifiedName~VehicleDoor"
cd apps/frontend  && npx tsc --noEmit && npx vitest run src/lib/api/vehicleMappers.test.ts src/lib/types/vehicleDoors.test.ts src/lib/utils/scene/loadOrder.test.ts src/lib/utils/scene/sceneFilter.test.ts src/lib/utils/geometry/calcCenterOfGravity.test.ts src/lib/utils/geometry/boxOrientations.test.ts && cd -
cd apps/algorithm-test-ui && npx tsc --noEmit && npx vitest run src/algorithm-test/verification/ && cd -
```

**Beklenen sonuçlar:** `S-03`, `S-13`, `S-34` grep'leri **0 isabet** dönerse hata duruyor; `S-07`'de `rg -l '"Depth"' Snapshots/` **0 dosya** dönmeli (bu, uyuşmazlığın kanıtı); `S-69` taraması ideal durumda 0 isabet vermeli, bugün ~25 isabet bekleniyor.
---

## 8. Doğrulama turu sonuçları (2026-08-16, tek geçiş)

Bölüm 7'deki komutlar tek seferde çalıştırıldı. Sonuçlar:

### 8.1 Test ve derleme durumu

| Paket | Komut | Sonuç |
|---|---|---|
| Backend (tüm çözüm) | `dotnet test apps/backend/CargoPilot.slnx` | ✅ **296/296 geçti** (Engine 61, Infrastructure 24, Application 211) |
| Frontend tip kontrolü | `npx tsc --noEmit` | ✅ hatasız |
| Frontend testleri | `npx vitest run` | ✅ **340/340 geçti** (30 dosya) |
| `algorithm-test-ui` | `npx tsc --noEmit` / `npx vitest run` | ❌ **çalıştırılamadı** — `apps/algorithm-test-ui/node_modules` yok, `vitest` ve `typescript` kurulu değil |

**Kritik gözlem:** Bu branch'teki bulguların hiçbiri mevcut test paketini kırmıyor.
Yeşil test turu, bulguların yokluğunun değil, **kapsam boşluğunun** kanıtıdır — S-04, S-05,
S-07, S-18, S-34 tam olarak "derleme ve testler geçer, davranış yanlış" sınıfındadır.

**Ek bulgu (S-71, medium):** `apps/algorithm-test-ui` bu branch'te eklendi, `package.json`'da
`test` ve `test:ci` scriptleri tanımlı ama bağımlılıkları kurulu değil ve paket kök
workspace'e bağlanmamış. Yani S-05/S-06/S-07'deki ters yön ve NaN sorunları yerelde de CI'da
da hiç çalıştırılmıyor. Doğrulama aracının kendisi devre dışı.

### 8.2 Grep doğrulamaları — bulgu bazında

| Bulgu | Beklenen | Gözlenen | Sonuç |
|---|---|---|---|
| S-01 | `SharePlanDto` `Doors` taşımalı | `:7 string DoorDirection,` — `Doors` yok | ✅ **doğrulandı** |
| S-02 | `VehicleInPlanDto` `Doors` taşımalı | `:10 LoadingType LoadingType,` — `Doors` yok | ✅ **doğrulandı** |
| S-03 | Duplicate handler kapı kopyalamalı | `Doors\|ReplaceDoors\|EnsureDoors` → **0 isabet** | ✅ **doğrulandı** |
| S-04 | Bölge tohumu `startX` kullanmalı | `:47 startX = fillFromMaxX ? VehicleWidth : 0m` ama `:65 extremePoints.Add((0m, 0m, zoneStart))` — sabit `0m` | ✅ **doğrulandı** |
| S-04 (test boşluğu) | LIFO + `fillFromMaxX=true` senaryosu | `YuklemeBaslangicKosesiTests.cs:100-101` `GroupId: null, UnloadingOrder: null` — kombinasyon hiç kurulmuyor | ✅ **doğrulandı** |
| S-05 | `lifoZones` z yönü | `:40-41 zStart: index*zoneSize, zEnd: (index+1)*zoneSize` — backend `LifoPlacement.cs:83` tersi | ✅ **doğrulandı** |
| S-07 | Fixture/test alan adı uyumu | Test `:91 Depth: number` / `:164 depth: p.Depth`; snapshot'larda `"Depth"` içeren dosya sayısı **0** | ✅ **doğrulandı** |
| S-08 | PDF ağırlık çarpımı | `:353 existing.weight += item.weight` + `:445 row.weight * row.count` → `N²·w` | ✅ **doğrulandı** |
| S-09 | Araç tipi enum | `AddVehicleModal.tsx:78-79 kamposet:2, konteyner:3` vs `VehicleType.cs Container=2, Romork=3` | ✅ **doğrulandı** |
| S-13 | Migration `LoadingType` kolonunu normalize etmeli | Migration'da hiç `UPDATE`/`SET` yok; yalnızca `VehicleDoors` backfill'i var, kolonda `3` kalıyor | ✅ **doğrulandı** |
| S-18 | `buildPlacements` `fillsFromMaxX` okumalı | `usePlanStore.ts:104,139,173 curX = 0` sabit; `fillsFromMaxX` yalnızca `loadOrder.ts` ve `vehicleDoors.test.ts`'te geçiyor | ✅ **doğrulandı** |
| S-34 | Golden senaryolar yeni alanları taşımalı | `FillFromMaxX` yalnızca `YuklemeBaslangicKosesiTests.cs:81` ve `VehicleDoorTests.cs`'te; golden/invariant senaryolarında **0 isabet** | ⚠️ **kısmen düzeltildi** — bulgu "hiç test yok" değil, "**golden-master ve invariant kapsamında yok**" olarak okunmalı; ayrık birim testleri mevcut |

**Sonuç:** Doğrulanan 12 kontrolün 11'i bulguyu birebir teyit etti, 1'i (S-34) kapsamı
daraltacak şekilde düzeltildi. Çürütülen bulgular (`PERS-04`, `PERS-07`, `FE-UI-14`) zaten
sentez öncesinde elenmişti.

### 8.3 Bu turda eklenen bulgu

| Kod | Dosya | Sev | Özet |
|---|---|---|---|
| S-71 | `apps/algorithm-test-ui/package.json` + eksik `node_modules` | medium | Doğrulama uygulamasının bağımlılıkları kurulu değil; `test`/`test:ci` scriptleri tanımlı ama hiç çalışmıyor. S-05/S-06/S-07 bu yüzden hiçbir turda yakalanamaz. PR-4'ün ilk adımı bağımlılık kurulumu + CI'a bağlama olmalı. |
