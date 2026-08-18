# Kod Taraması — Ağustos 2026

**Son güncelleme:** 2026-08-15 · **Durum:** Aktif (tarama tarihi 2026-08-04; sonradan geçersizleşen bulgular yerinde işaretlendi)

Kod tabanının 6 kategoride taranmasından çıkan gerçek durum: stack, algoritma, devops, veritabanı ve test bulguları.

---

**Tarama:** 2026-08-04 · 6 kategori (frontend, backend, algoritma, devops, veritabanı, test/kalite)
paralel ajanlarla kod tabanı üzerinden tarandı; bulgular burada birleştirildi.
Yöntem: yalnızca repo dosya içeriği okundu — sunucuya SSH atılmadı, GHCR/Actions geçmişi sorgulanmadı.

> Bu doküman **kod ne diyor** sorusunun cevabıdır. Dokümanların iddiaları ile kodun
> gerçeği çeliştiğinde burada kod esas alınmıştır. Özet için `project-snapshot.md`,
> doküman haritası için `doc-map.md`.

---

## 1. En Kritik Bulgular (kategoriler arası)

| # | Bulgu | Kategori | Etki |
|---|-------|----------|------|
| 1 | **MediatR fiilen kullanılıyor** — `architecture.md` ve eski snapshot "MediatR yok, service-based" diyor; oysa Application katmanı ~150+ dosyada Command/Query/Handler (`IRequestHandler<>`) deseniyle MediatR 12.4.1 kullanıyor, controller'lar `IMediator.Send()` çağırıyor | Backend | `architecture.md` yeni geliştiriciyi yanlış yönlendiriyor |
| 2 | **Backend test projesi hiç yok, E2E yok** — CI'daki `dotnet test` adımı `*.Tests.csproj` bulamadığı için sessizce atlanıyor; Playwright ve React Testing Library paketleri repoda kurulu bile değil; kök `tests/` klasörü boş placeholder<br>**2026-08-13 itibarıyla geçerli değil:** `CargoPilot.Engine.Tests` (7 dosya: determinizm, LIFO/volume-first/weight-balance golden master, performans taban çizgisi, kırılganlık, modül bayrakları) ve `CargoPilot.Infrastructure.Tests` (4 dosya) eklendi, ikisi de `cargo-pilot.sln`'de kayıtlı; CI `dotnet test cargo-pilot.sln --no-build` koşturuyor. **E2E ve RTL hâlâ yok.** | Test | Kalite kapıları (CLAUDE.md) araçsal olarak sağlanamıyor; algoritmanın hiç testi yok → algoritma testleri 2026-08-13 itibarıyla var, E2E boşluğu açık |
| 3 | **Kırılganlık (fragility) optimizasyona hiç girmiyor** — `Item.FragilityType` entity'de var ama `OptimizationItemInput`'a taşınmıyor; `UnplacedReason.FragilityOrHandlingConstraint` hiçbir yerde üretilmiyor. Yüzey/rotasyon kısıtı yalnızca frontend'de | Algoritma | 3D invariant "kırılganlık zayıflatılmaz" backend'de karşılıksız |
| 4 | **Manuel 3D düzenlemeler kalıcı değil** — hiçbir endpoint placement pozisyonu kabul etmiyor; `updatePlacementPosition`/`setOrientation` sadece Zustand'a yazıyor, kaydetmenin tek yolu re-optimize (manuel düzen kaybolur) | Algoritma/FE | Kullanıcının el emeği sessizce kayboluyor |
| 5 | **Frontend sürümleri dokümanlardan ileride** — Vite **8**, React Router **7**, Zustand **5**, zod **4** kurulu; dokümanlar v5/v6/v4/v3 diyor. i18next + react-i18next aktif kullanımda ama hiçbir dokümanda geçmiyor | Frontend | Snapshot güncellendi (bu taramayla) |
| 6 | **Tüm portlar dışa açık** — hiçbir compose dosyasında `127.0.0.1:` öneki yok (MSSQL, MinIO Console, Grafana, Prometheus dahil); hiçbir serviste kaynak limiti (`mem_limit`/`cpus`) ve `logging:` bloğu yok | DevOps | `docs/archive/devops-iyilestirme-analizi-2026-08.md`'de detaylı; tek sunucuda prod+test OOM riski somut |
| 7 | **Rollback tag/SHA uyumsuzluğu** — `release-tag.yml` etiketleri `main` merge commit'lerine işaret ediyor; `rollback.sh` `test-{sha}` image'ı türetiyor ama bu SHA'lar `test` dalında yok → rollback `manifest unknown` ile stack kapalıyken başarısız olabilir | DevOps | Rollback güvencesi kâğıt üzerinde |

---

## 2. Frontend

- **Stack (kurulu):** React 18.3, Vite 8.0, TS 5.9, Tailwind 3.4, Radix (17 paket) + shadcn kopyaları (`components/ui`, 31 dosya), TanStack Query 5.99, Zustand 5.0, RHF 7.72 + zod 4.3, React Router 7.14, three 0.162 + R3F 8.18 + drei 9.122, @react-pdf/renderer 4.5, xlsx 0.18, i18next 26 + react-i18next 17, axios 1.15, Vitest 4.1.
- **Yapı:** 341 ts/tsx dosyası. `pages/` 36, `features/platform` 71 (en büyük), `features/data-management` 53, `features/planning` 37 (3D sahne 15 dosya), `lib/api` 22, `lib/store` 10 store.
- **Kurallara uyum iyi:** `any` tek yerde (belgeli), default export tek (i18n singleton), `React.FC` yok, token persist edilmiyor (`sessionStorage`'a sadece user/role), tek barrel ihlali `lib/api/index.ts`.
- **Dikkat:** `ProtectedRoute.requiredRole` prop'u var ama `router.tsx`'te hiçbir rota kullanmıyor (rota bazlı RBAC fiilen yok). `DashboardPage.tsx` store'u atlayıp doğrudan `localStorage`'a yazıyor. Dev dosyalar: `PlanLeftPanel.tsx` 2039 satır, `ProductForm.tsx` 1444, `CargoMeshInstanced.tsx` 1395.
- Kök CLAUDE.md `/plan/new` diyor; gerçek rota `/planning/new`.

## 3. Backend

- **Stack:** .NET 8 (4 proje, referans yönü doğru), **MediatR 12.4.1** (Feature/Command/Query/Handler), FluentValidation 11.11, EF Core 8.0.25, **Hangfire 1.8.14** (SQL storage; `TrialExpiryNotificationJob`, `NotificationCleanupJob`, `ErpExportJob`), BCrypt, Minio 7, JWT + Google OAuth, Serilog, Swashbuckle, **prometheus-net**. Resend NuGet değil — `ResendEmailService` HttpClient ile REST çağırıyor.
- **Doğrulanan desenler:** `Result<T>`/`Error`, aggregate-specific repository (17 interface), soft delete global filter, `BaseEntity` audit, global exception middleware sadece son çare. TODO/FIXME sayısı 0.
- **16 controller:** Auth, Me, Company, CompanyUsers, Items, DraftItems, Vehicles, Plans (en büyük), ErpSettings, Integrations, Subscriptions, Settings, Shares, Notifications, Contact, Home. Health: `/health`, `/health/detail` (DB + MinIO check). *(2026-08 güncelleme: `/health/detail` ve `/metrics` artık `SuperAdmin` policy'si arkasında; sığ `/health` açık.)*
- **ERP zinciri uçtan uca kodda:** entity'ler + `IntegrationsController` + `LogoErpConnector`/`NetsisErpConnector` + `SqlServerErpProductFetcher` + Hangfire export job; ERP şifreleri DataProtection ile korunuyor. Canlı ERP doğrulaması kod dışı, bilinmiyor.
- **Ölü/yarım:** `UseInMemoryDatabase` bayrağı çalışmaz durumda (repo kayıtları atlanmıyor → DI çözümleme patlar); `architecture.md`'nin `Cargo`/`TrackingNumber` örnekleri kurgusal.

## 4. Algoritma

- **Motor:** `apps/backend/CargoPilot.Application/Common/Optimization/` — **7 dosya / 1036 satır**
  *(ölçüm 2026-08-15 ikinci ölçüm, `dev` @ `96e9fd8b`:
  `wc -l apps/backend/CargoPilot.Application/Common/Optimization/*.cs` → BalanceScoring 220 ·
  ItemOrdering 71 · LifoPlacement 118 · OptimizationEngine 268 · PlacedBox 17 ·
  PlacementValidator 314 · VolumeScoring 28. Aynı günün erken saatinde ölçülen **915** değeri
  OPT-01 (#989) ve OPT-02 (#990) `dev`'e alınmadan öncesine aittir ve bayattır.)* (`OptimizationEngine.cs`, `PlacementValidator.cs`, `BalanceScoring.cs`, `LifoPlacement.cs`, `ItemOrdering.cs`, `VolumeScoring.cs`, `PlacedBox.cs`) — tek geçiş greedy **extreme-point + skor (argmin)**; yalnızca `WeightBalance` kriterinde 3 turlu greedy-swap denge iyileştirici. Ön filtre: `ContaminationFilter` (BFS, en yüksek hacimli grup kazanır).
- **Kısıtlar (backend):** sınır, AABB çakışma, %80 taban desteği, `IsStackable`+LIFO, `MaxStackCount`, `MaxWeightOnTop` (tüm alt kutular), `AllowedRotations` (1/2/3/6 varyant), ağırlık kapasitesi. CoG **yalnızca soft ceza** (hard eşik yok). Yükleme yönü sadece `Lifo`+`Rear`'da etkili. **Kırılganlık modellenmemiş.**

### 4.1 LIFO bölge kısıtı — yumuşaktan iki kademeli sert kısıta (OPT-02, 2026-08-15)

**Eski davranış (bu taramanın yazıldığı hâl):** boşaltma grubu bölgesi (`LifoPlacement.cs`) yalnızca
skor cezasıyla caydırılıyordu; ceza katsayısı **2 000**, yerçekimi terimi ise **1 000 000** —
yani bölge cezası 500× zayıftı. Sonuç: zeminde yer olduğu sürece bölge kısıtı **daima** ihlal ediliyordu.

**Yeni davranış:** aday seçimi **iki kademelidir**. Bölge içinde geçerli en az bir aday varsa seçim
**yalnız** o adaylar arasından yapılır (sert kısıt); bölge içinde hiç aday yoksa mevcut skorlamaya
düşülür (yedek kademe). **Ceza katsayısı 2 000'de bırakıldı** — artık yalnızca yedek kademedeki
adayları sıralamak için kullanılıyor. Düzeltme katsayı büyütmekle değil, seçim mantığını
ikiye ayırmakla yapıldı.

| Ölçüm | Önce | Sonra |
|---|---|---|
| P1 senaryosu bölge ihlali | 4/8 kutu | **0/8** |
| P2 senaryosu bölge ihlali | 2/5 kutu | **0/5** |
| P1 yerleşen kutu / FillRate | 8 / 1,0 | 8 / 1,0 (değişmedi) |
| P2 yerleşen kutu / FillRate | 5 / 0,2125 | 5 / 0,2125 (değişmedi) |
| `CargoPilot.Engine.Tests` | 35 test / 2 kırmızı | **35/35 yeşil**, 39 sn |
| Golden snapshot kayması | — | **0 bayt** |
| LIFO performansı (500 kutu) | 9 777 ms | **8 107 ms** |

**Kapasite kaybı yok:** FillRate paritesi teste `assert` olarak konuldu.
Dal: `fix/OPT-02-lifo-bolge-sert-kisiti`, commit `3d074d2c` (test) → `af6ac08f` (düzeltme),
`git diff --stat dev..HEAD` = 3 dosya / +185/−1, yeni test dosyası `LifoBolgeKisitiTests.cs`.

> **✅ Durum güncellemesi (2026-08-15, ikinci ölçüm):** yukarıdaki dal PR **#990** ile `dev`'e alındı;
> bir üstteki "bu dal `dev`'e alınmamıştır" uyarısı geçersizdi ve kaldırıldı. `dev` @ `96e9fd8b`
> üzerinde doğrulanan hâl:
> - Sert kısıt kademesi: `OptimizationEngine.cs:131` → `LifoPlacement.IsInsideZone(...) && score < bestInZoneScore`
> - Yedek kademe: `OptimizationEngine.cs:264` → `LifoPlacement.ZonePenalty(...)`
> - Ceza katsayısı: `LifoPlacement.cs:30` `ZoneOverflowPenaltyPerCm = 2_000m` — **yalnızca yedek
>   kademedeki adayları sıralar.** "Bölge ihlali cezalandırılır" tarifi artık yanlıştır: bölge içinde
>   geçerli aday varken ihlalli aday hiç seçilemez.
> - Yukarıdaki 35/35 ve 39 sn değerleri o dalın ölçümüdür. `dev` üzerindeki güncel ölçüm:
>   **`CargoPilot.Engine.Tests` 61/61 yeşil (50 sn)**, `CargoPilot.Infrastructure.Tests` 20/20 yeşil
>   (30 ms) — proje düzeyinde `dotnet test <csproj>` (solution düzeyi `dotnet build CargoPilot.slnx`
>   MSB4068 ile çalışmaz). P1/P2 ölçüm satırları yeniden koşulmadı, dal ölçümü olarak duruyor.
>
> **PR #997 (bölge yönü):** bölge haritası ters çevrildi. `LifoPlacement.ComputeGroupZones`
> artık `zones[orders[i]] = (length - (i+1)*zoneSize, length - i*zoneSize)` (`LifoPlacement.cs:82`) —
> referans kapı `z = length`, `UnloadingOrder = 1` (ilk inecek) kapıya en yakın bölgeyi alır.
> Bu yönü kilitleyen testler: `GroupZoneTests.cs:29`, `LifoGoldenMasterTests.cs:10-11`,
> `ModulBayraklariTests.cs:129`.
>
> **PR #989 (OPT-01):** `BalanceScoring` greedy-swap'i artık takasın taşıyıcı yönünü de doğruluyor —
> `BalanceScoring.cs:182-183` her iki kutu için `PlacementValidator.ViolatesLoadAbove` çağırıyor ve
> takas sonrası eski üst yüzeylerdeki (`oldATopY`/`oldBTopY`) destek yeniden denetleniyor.
> Önceki hâlde dört kısıt yalnız aşağı bakıyordu.
>
> **PR #1002:** bölge testinin sınırları artık formülü kopyalamak yerine
> `LifoPlacement.ComputeGroupZones`'dan okunuyor (`LifoBolgeKisitiTests.cs:113`).

### 4.2 Bilinen algoritma borcu (2026-08-15)

OPT-01 ve OPT-02 kararlarının **bilinçli olarak kapsam dışı** bıraktıkları:

*Satır numaraları **2026-08-15 ikinci ölçümde**, `dev` @ `96e9fd8b` üzerinde yeniden doğrulandı;
#997/#1004 sonrası bir kısmı kaymıştı.*

| # | Konum | Borç | Durum |
|---|---|---|---|
| OPT-14 | `OptimizationEngine.cs:72` | `item.UnloadingOrder ?? -1` sentinel'i `GroupId` kontrolü yapmıyor — grubu olmayan ama boşaltma sırası olan kutu yanlış bölgeye eşlenebilir | ⚠️ açık (satır **değişmedi**) |
| OPT-10 | `LifoPlacement.cs:63` | Bölge kısıtı yalnız `LoadingType.Rear`'ı kapsıyor (`if (!enabled \|\| loadingType != LoadingType.Rear) return [];`); 5 yükleme tipinin **4'ünde bölge hiç oluşmuyor** | ⚠️ açık (eski satır 53 → **63**) |
| — | `LifoPlacement.cs:76` | Eşit bölge bölme kusuru: `var zoneSize = vehicleLength / orders.Count;` — bölge dar kaldığında yedek kademe devreye giriyor ve ihlal **raporlanmadan** sürüyor | ⚠️ açık (eski satır 66 → **76**) |
| — | (çıktı katmanı) | Yedek kademeye düşen yerleşim hiçbir yere yazılmıyor; bir uyarı mekanizması gerekiyor. **Yeni `UnplacedReason` değil** — kutu yerleşiyor, yalnız bölge dışına düşüyor (bilinçli karar) | ⚠️ açık — `grep -rn "UnplacedReason\|LoadingPlanWarnings" apps/backend` yedek kademe için yazıcı göstermiyor |
| OPT-01 | `CargoPilot.Engine.Tests` | `ViolatesLoadAbove` için kırılganlık / `MaxWeightOnTop` odaklı **doğrudan takas testi yok**; mevcut kapsam dolaylı | ✅ **kapandı** — #989 ile `BalanceSwapSupportTests.cs` ve `PlacementValidatorSupportTests.cs` eklendi (git'te izlenen dosyalar) |
| — | `GroupZoneTests.cs:45-46` | Bölge sınırları hâlâ `VehicleLength - unloadingOrder * ZoneSize` formülü **kopyalanarak** kuruluyor; `ComputeGroupZones` değişirse test sessizce yanlış sınırı doğrular | ⚠️ açık — #1002 aynı düzeltmeyi yalnız `LifoBolgeKisitiTests.cs:113`'te yaptı, `CargoPilot.Infrastructure.Tests`'teki bu kopya kaldı |

- **Kayıp çıktılar:** `LoadingPlanWarnings` tablosu var ama hiçbir yazıcı yok; `WeightBalanceOffsetX/Z` hesaplanıyor ama DB'ye yazılmıyor (API'de hep null). Unplaced sebeplerinden 3'ü (`StackingNotAllowed`, `FragilityOrHandlingConstraint`, `RotationOrGeometryConstraint`) hiç üretilmiyor.
- **Çift mantık:** frontend `buildPlacements` (shelf/row) tamamen ayrı bir heuristik — ön izleme/staging için. Manuel drag doğrulaması backend kurallarının **alt kümesi**: %80 destek, MaxStackCount, MaxWeightOnTop, LIFO, drag sonrası ağırlık kontrolü frontend'de yok; tek violation mesajı sınır/çakışma. Yüzey (face) kısıtı ise **sadece** frontend'de var.
- **Sözleşme:** eksen eşlemesi ve kutu pivotu — origin'e en yakın köşe `(min x, min y, min z)`, `x`=width / `y`=height / `z`=length — backend'de tutarlı; artık `docs/COORDINATE_STANDARD.md`'de yazılı (tarama anında yazılı değildi, "sol-alt-arka" ifadesi #997/#1004 sonrası geçersiz); cm birimi hiçbir yerde zorlanmıyor (konvansiyon). Pivot offset `scene-config.ts`'te değil, `BoxWrapper`/`CargoMeshInstanced` içine dağılmış (CLAUDE.md kuralının kısmi ihlali). Rotasyon→boyut eşlemesi FE/BE birebir uyumlu doğrulandı; ancak FE `ALLOWED_ROTATIONS.YawOnly=6`'nın backend enum karşılığı yok (latent uyumsuzluk). `allowContamination` FE'den gönderiliyor, BE komutlarında alan yok → sessizce yok sayılıyor.
- **Performans:** dominance filtresi yok → pratik O(N³); `ImproveBalance` O(N⁴)'e çıkabilir; sıcak döngü `decimal`; `CancellationToken`/timeout yok (HTTP isteğini bloke ediyor); plan başına kutu sayısı sınırsız; hiç benchmark/test yok. FE: `InstancedMesh` eşiği 50, dispose disiplinli, `computeViolations` O(n²) ama sadece `pointerup`'ta.
- **Tasarım dokümanları arşiv** (`docs/archive/algoritma-tasarimi/matematiksel-model.md`, `sistem-mimarisi.md`, `bin-packing-uygulama-plani.md`): kod hem ileride (AllowedRotations, gruplama, kontaminasyon) hem geride (dominance filtresi, CoG hard constraint + fallback + uyarı üretimi, normalize maliyet fonksiyonu yok). Arşiv notundaki "MediatR kullanılmaz" cümlesi de hatalı.

## 5. Veritabanı

- **43 EF migration** (`20260424` → `20260518`), `database/` kök klasörü boş placeholder (migrations/seeds sadece `.gitkeep`).
- **25 DbSet:** auth/tenancy 7, item/vehicle 4, loading plan 6, ERP 5, bildirim/paylaşım 2, DataProtectionKey. Soft delete filter 18 entity'de (session/token tablolarında bilinçli yok).
- **Seed:** migration içi demo verisi (`SeedLoadingPlanDemoData`) + runtime `DbInitializer` (Default Logistics şirketi, `admin@cargopilot.com` SuperAdmin, TestERP entegrasyonu).
- ERP şema eşlemesi (`TBLSTSABIT`/`TBLSIPAMAS`/`TBLSIPATRA` → `Item.ErpId` vb.) doküman-kod tutarlı.
- `database-migrations.md` gerçek durumla uyumlu bulundu.

## 6. DevOps

Detaylı 51 bulgu: `docs/archive/devops-iyilestirme-analizi-2026-08.md`. Bu taramanın eklediği/teyit ettiği başlıklar:

- **Compose:** test + prod + 2 monitoring dosyası; frontend'de healthcheck hiçbir ortamda yok, monitoring'in 6 servisinde de yok. Portlar `0.0.0.0`, kaynak limiti ve `logging:` bloğu hiçbir serviste yok, MSSQL `user: root`.
- **CI/CD:** `test`'e push → GHCR `:test` + `:test-{sha}` → SSH deploy. `main` push sadece `v0.<n>.0` tag'i atar; **prod image/pipeline yok** (`v*` tag hiçbir workflow tetiklemiyor). `rollback.yml`'de `target_ref` doğrudan shell'e gömülü (injection riski); `test-deploy.yml`'de secret yoksa açık metin fallback parolalar kullanılıyor.
- **Dockerfile:** backend `COPY . .` restore'dan önce (cache verimsiz); frontend `npm install` (`npm ci` değil); Node 20.
- **Nginx:** repoda sadece `cargopilot-test.conf`; `setup-nginx.sh` ortam parametresi almadan onu kopyalıyor — **prod nginx conf yok**. `/api/` altında `client_max_body_size` tanımsız (1MB varsayılan).
- **Monitoring:** alert kuralı gerçekte 6 (doküman 3 diyor); contact point dosyaları var ama `GF_SMTP_*` hiçbir compose'da yok → e-posta gidemez.

## 7. Test / Kalite

- **Toplam 13 test dosyası**, tamamı frontend (utils 7, hook 1, store 1, three 1, schema/type 2, +1). Backend 0, E2E 0, kök `tests/` boş.
- **CI:** frontend `vitest run` çalışıyor; backend `dotnet test` koşullu ve fiilen **atlanıyor**; E2E adımı yok.

> **2026-08-13 güncellemesi (bu iki madde için):** backend artık test içeriyor —
> `apps/backend/CargoPilot.Engine.Tests` (7 dosya) + `apps/backend/CargoPilot.Infrastructure.Tests`
> (4 dosya), xUnit 2.5, ikisi de `cargo-pilot.sln`'de kayıtlı. `ci.yml`'deki koşullu adım artık
> proje bulduğu için `dotnet test cargo-pilot.sln --no-build --configuration Release` gerçekten
> koşuyor. E2E (Playwright) ve React Testing Library durumu değişmedi — hâlâ yok.

> **2026-08-15 ikinci ölçüm (`dev` @ `96e9fd8b`):** backend test hacmi #989/#990/#1002 ile büyüdü.
> Proje düzeyinde `dotnet test <csproj>` çıktısı: **`CargoPilot.Engine.Tests` 61/61 yeşil (50 sn)**,
> **`CargoPilot.Infrastructure.Tests` 20/20 yeşil (30 ms)** — toplam **81 test / 15 test sınıfı**.
> Engine tarafında 37 adet `[Fact]`/`[Theory]` attribute'u var; `[Theory]` satırları birden çok
> test-case ürettiği için attribute sayısı test sayısından küçüktür. Yeni dosyalar:
> `BalanceSwapSupportTests.cs`, `PlacementValidatorSupportTests.cs`, `InvariantTests.cs`,
> `LifoBolgeKisitiTests.cs`, `Golden/InvariantScenarioSource.cs`, `Golden/PhysicalInvariants.cs`.
> **Ölçüm notu:** `dotnet build CargoPilot.slnx` MSB4068 ile başarısız oluyor; ölçüm proje
> düzeyinde alınmalıdır. Frontend/E2E durumu bu turda yeniden ölçülmedi.
- **Zincir:** ESLint 10 (any=error, 3D sahnede çıplak `<mesh>` yasak kuralı dahil) + Prettier + husky/lint-staged aktif. Backend'de format/analyzer adımı yok.
- **En kritik boşluklar:** optimizasyon motoru, 3D koordinat/pivot eşlemesi, auth akışı, API entegrasyonu.

---

## 8. Doküman Güncelleme İhtiyaçları (bu taramadan çıkan)

| Doküman | Sorun | Durum |
|---------|-------|-------|
| `docs/context/project-snapshot.md` §2 | MediatR/sürümler/i18n/test satırı eskiydi | ✅ Bu taramayla güncellendi |
| `docs/context/doc-map.md` | `docs/archive/devops-iyilestirme-analizi-2026-08.md` ve 3 algoritma tasarım arşivi listede yoktu | ✅ Bu taramayla güncellendi |
| `apps/backend/docs/architecture.md` | "MediatR yok" iddiası, kurgusal `Cargo` örnekleri, çalışmayan InMemory bölümü | ✅ 2026-08-04'te kod gerçeğine göre düzeltildi |
| `docs/devops/devops-backlog.md` 1.2-1.4 | PR #908 ile kapanan maddeler hâlâ "Açık" işaretli | ✅ 2026-08-04'te işaretlendi; 2.4 SMTP kapsamıyla güncellendi |
| `docs/devops/known-issues.md` :148 | "max-size: 100m tanımlı" iddiası gerçek dışı (hiçbir compose'da logging yok) | ✅ 2026-08-04'te düzeltildi |
| `docs/devops/monitoring-setup.md` | 3 alert diyor, gerçekte 6; "contact point yok" ifadesi eksik/SMTP olarak düzeltilmeli | ✅ 2026-08-04'te düzeltildi |
| Kök `CLAUDE.md` | `/plan/new` → gerçek rota `/planning/new` | ✅ 2026-08-04'te düzeltildi |
