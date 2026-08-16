# Proje Anlık Görüntüsü

**Son güncelleme:** 2026-08-13 · **Durum:** Aktif

Stack, ortamlar, portlar, CI/CD ve açık risklerin tek sayfalık teknik anlık görüntüsü.

---

**Kaynak tarama:** 2026-08-03 · `test` @ `3c42f65a`.
**Doküman envanteri (2026-08-16 ölçümü):** repoda **47** `.md` dosyası / 12.342 satır
(`git ls-files '*.md' | wc -l`). Bu satırdaki eski "25 dosya" değeri 2026-08-03 anına aitti.
Güncel harita: [doc-map.md](doc-map.md).
**Kod taraması:** 2026-08-04 · 6 kategoride kod tabanı tarandı, §2 kodla doğrulanıp düzeltildi.
Detaylı bulgular: [kod-taramasi-2026-08.md](kod-taramasi-2026-08.md).

---

## 1. Ürün

Cargo Pilot — yük planlama süreçlerini dijitalleştiren ve 3D olarak görselleştiren web platformu.
Monorepo: `apps/frontend` (React) + `apps/backend` (.NET 8) + `infra` (Docker/CI) + `database`.

---

## 2. Teknoloji

| Katman | Teknoloji (kurulu sürüm, 2026-08-04 kod taraması) | Kritik kural |
|--------|-----------|--------------|
| Frontend | React 18.3 + **Vite 8** + TS 5.9 strict + **React Router 7** | `any` yasak, barrel export yasak, default export yasak |
| UI | Tailwind v3.4 + shadcn/ui (kopya, `components/ui`) + Radix | Sıfırdan UI bileşeni yazılmaz, `cn()` zorunlu, `@apply` yasak |
| Form | react-hook-form 7 + **zod 4** | Tip `z.infer`'den türetilir, manuel interface yazılmaz |
| Server state | TanStack Query v5 | Tuple query key, API verisi Zustand'a **kopyalanmaz** |
| Client state | **Zustand v5** (10 store) | Sadece UI state; access token yalnızca `useAuthStore` (localStorage yasak) |
| i18n | i18next 26 + react-i18next (`tr` varsayılan, `en` fallback) | Kaynaklar `src/locales/{tr,en}.json` |
| 3D | Three.js 0.162 + R3F 8 + drei 9 | cm birimi; X=width, Y=height, **Z=length** (uzak yüz `z = 0` → referans kapı `z = length`); origin **uzak-sol-alt köşe** `(min x, min y, min z)`. Kapılar liste: `doors: [{type, face}]`, her tipten en fazla bir kapı. *`depth`/"sol-alt-arka" terminolojisi #997 ile kaldırıldı, kalan isabetler 2026-08-16'da temizlendi; bağlayıcı tanım `docs/COORDINATE_STANDARD.md`* |
| Export | @react-pdf/renderer 4, SheetJS | PDF dinamik import ile code-split, Canvas `preserveDrawingBuffer: true` |
| Backend | .NET 8, Clean Architecture + **MediatR 12** (Command/Query/Handler) | Domain ← Application ← Infrastructure/WebAPI. *(Eski "MediatR yok, service-based" iddiası kodla çelişiyordu — architecture.md hâlâ eski modeli anlatıyor)* |
| Backend hata | `Result<T>` + `Error` + `ErrorType` | Exception ile akış kontrolü yapılmaz (kodda doğrulandı) |
| Background job | **Hangfire 1.8** (SQL storage) | Trial expiry, notification cleanup, ERP export job'ları; dashboard SuperAdmin'e kısıtlı |
| Optimizasyon | `OptimizationEngine` (**Application/Common/Optimization**, extreme-point greedy, **9 dosya / 1201 satır**) | `caab495d` (2026-08-11) ile Infrastructure'dan taşındı ve 7 dosyaya bölündü. Kırılganlık modelde **yok**; CoG sadece soft ceza. LIFO bölge kısıtı **#990 ile iki kademeli sert kısıt oldu** (bölge içi aday varsa yalnız onlardan seçilir; yoksa cezalı yedek kademe) ve **#997 ile bölge haritası ters çevrildi** (referans kapı `z = length`). Denge takası **#989**'dan beri `ViolatesLoadAbove` ile destek doğrulaması yapıyor. *Satır ölçümü 2026-08-15 ikinci ölçüm, `dev` @ `96e9fd8b`, `wc -l …/Optimization/*.cs`; aynı günün erken 915 değeri bayattır.* Detay: kod-taramasi §4, §4.1, §4.2 (bilinen borç) |
| Validation | FluentValidation 11 (BE) / Zod (FE) | — |
| DB | SQL Server 2022 + EF Core 8.0.25 (**62 migration**) | Soft delete global query filter (18/25 entity), `BaseEntity` audit alanları |
| Storage | MinIO | Bucket policy public, nginx `/media/` proxy |
| Test | Vitest 4 (FE, **16 dosya / ~151 test-case — alt sınır**) + **xUnit 2.5 (BE, 2 proje / 15 test sınıfı / 81 test)** | RTL/Playwright paketleri kurulu değil; `CargoPilot.Engine.Tests` (golden-master, determinizm, kırılganlık, performans taban çizgisi, modül bayrakları, LIFO bölge kısıtı, denge takası desteği) + `CargoPilot.Infrastructure.Tests` ikisi de `cargo-pilot.sln`'de kayıtlı, CI `dotnet test cargo-pilot.sln --no-build` koşturuyor. *Backend ölçümü 2026-08-15 ikinci ölçüm, `dev` @ `96e9fd8b`, proje düzeyinde `dotnet test`: **Engine.Tests 61/61 yeşil** (50 sn, 37 `[Fact]`/`[Theory]` attribute — `[Theory]` satırları birden çok test-case üretir), **Infrastructure.Tests 20/20 yeşil** (30 ms). `dotnet build CargoPilot.slnx` MSB4068 ile çalışmaz, ölçüm proje düzeyinde alınmalıdır. Önceki "11 test sınıfı" değeri #989/#990 öncesine aitti.* *Frontend sayısı 2026-08-15'te yeniden ölçüldü: 16 test dosyası, `grep -oE '^\s*(it|test)\('` ile 151 test-case satırı. Bu bir **alt sınırdır** — `it.each`/`describe.each` gibi data-driven kalıplar regex sayımına girmez. Önceki "166 test" değeri doğrulanamadı.* |
| Paket | npm (pnpm/yarn yasak) | — |

**3D pivot farkı:** Three.js pivot merkezde, backend pivot origin'e en yakın köşede `(min x, min y, min z)`.
`BoxWrapper` / merkezi `lib/config/scene-config.ts` ile çözülür. 50+ kutuda `InstancedMesh` zorunlu.

---

## 3. Ortamlar

| Ortam | Kaynak | URL | Durum |
|-------|--------|-----|-------|
| Test | `test` push | http://cargopilot.divizyon.org · 104.247.163.42 | ✅ Aktif (demo da buradan yapılıyor) |
| Production | `v*` tag (pipeline yok) | 104.247.163.42:80 | ❌ **Hiç deploy edilmedi** |

**Sunucu:** tek makine, Ubuntu 24.04, 8 vCPU / 16 GB / 147 GB SSD. Prod ve test aynı host'ta.

| Servis | Test portu | Prod portu |
|--------|-----------|-----------|
| Frontend | 3001 | 80 |
| Backend API | 8081 | 8080 |
| MSSQL | 1434 (`CargoPilotTest`) | 1433 (`CargoPilot`) |
| MinIO API / Console | 9002 / 9003 | 9000 / 9001 |
| Grafana / Prometheus | 3002 / 9091 | 3000 / 9090 |

Ek: `DIVIZYON` ERP veritabanı (müşteri `.bak` restore'u) test MSSQL container'ında — sadece geliştirme içindir.

---

## 4. CI/CD

Workflow'lar: `ci.yml`, `test-deploy.yml`, `cache-cleanup.yml`, `sync-base-images.yml`, `rollback.yml`.

Workflow'lar ayrıca: `release-tag.yml` (2026-08-03'te eklendi), `promote.yml` — *Terfi*
(`workflow_dispatch`; `dev→test` / `test→main` terfi PR'ını `PROMOTION_PAT` ile merge eder,
`gh pr merge` yerine bunu kullanın), `codeql.yml` — *CodeQL* (2026-08-13'te eklendi;
PR → `dev` + haftalık tam tarama).

| Tetikleyici | Sonuç |
|-------------|-------|
| push `feat/**`, `fix/**`, `hotfix/**`, `chore/**`, `infra/**` (+ eski `feature/**`, `bugfix/**`) | CI + geçici stack doğrulaması (inline build) |
| PR → `dev` | CI + Docker Image Build + CodeQL |
| PR → `test` | CI + Terfi Zinciri + Migration + Image Build + Deploy (Test) |
| push `test` | Image Build → GHCR → **test sunucusuna deploy** |
| PR → `main` | CI + Terfi Zinciri + Migration |
| push `main` | `v0.<n>.0` sürüm etiketi (deploy yok) |
| `v*` tag | **hiçbir şey — production pipeline yok** (devops-backlog 2.2) |

- `enforce-test-base` job'u kaldırıldı; yerine **`Terfi Zinciri Kontrolü`** (`ci.yml`) geldi:
  `test`'e yalnızca `dev`'den, `main`'e yalnızca `test` veya `hotfix/*` üzerinden PR açılabilir.
  2026-08-03'te boş bir PR ile fiilen doğrulandı (PR #904 engellendi).
- GHCR image'ları **public**; geliştirici login'i gerekmiyor. Immutable tag: `test-{sha}`.
- Koruma **repository ruleset** ile yapılıyor (klasik branch protection API'si 404 döner — yanıltıcıdır):
  `main-protection`, `test-protection`, `dev-protection` aktif; `freeze` kapalı.

| Ruleset | Merge yöntemi | Required check |
|---------|---------------|----------------|
| `dev-protection` | sadece **squash** | `Frontend CI`, `Backend CI` |
| `test-protection` | sadece **merge commit** | `Terfi Zinciri`, `Frontend CI`, `Backend CI`, `Migration`, `Image Build`, `Deploy (Test)` |
| `main-protection` | sadece **merge commit** | `Terfi Zinciri`, `Frontend CI`, `Backend CI`, `Migration` |

Merge yöntemi kısıtı kritik: terfi PR'ında squash yapılırsa hedef dal, kaynakta olmayan yeni bir
commit alır ve dallar kalıcı ayrışır. Ruleset yanlış seçimi mümkün kılmıyor.

Üçünde de: PR zorunlu ama **zorunlu review yok** — `required_approving_review_count: 0`
(2026-08-08'de kaldırıldı, bkz. [branching.md](../conventions/branching.md) § PR Kuralları).
Tek kapı, tablodaki required check'lerdir. Branch silme ve force-push kapalı,
bypass **sadece PR ile** (eski `always` kaldırıldı).
`main`'de ayrıca `update` kuralı → doğrudan push engelli.
`strict_required_status_checks_policy` üçünde de **false** — aksi hâlde her terfiden sonra
geri-merge zorunlu olurdu.

- `delete_branch_on_merge` = **true**.

---

## 5. Açık Riskler (docs/devops/known-issues.md + devops-backlog.md özeti)

> Ayrıca: 51 bulguluk detaylı analiz `docs/archive/devops-iyilestirme-analizi-2026-08.md`'de;
> 2026-08-04 kod taramasının kategoriler arası kritik bulguları [kod-taramasi-2026-08.md](kod-taramasi-2026-08.md) §1'de.

| # | Risk | Seviye |
|---|------|--------|
| 1 | Production stack hiç deploy edilmedi (`.env.prod` yok, compose çalışmadı) | 🔴 Kritik |
| 2 | Production CI/CD ve prod GHCR image pipeline'ı yok | 🔴 Kritik |
| 3 | ~~`docker-compose.prod.yml` eksik~~ → 2026-08-03'te giderildi (`Minio__*`, `OAuth__Google__*`, `Cors__*`, `Resend__*`, backend healthcheck). **Sahada hiç çalıştırılmadı.** | 🟠 Yüksek |
| 4 | MSSQL SA parolası git geçmişinde — **rotate edilmedi** | 🔴 Güvenlik |
| 5 | Docker image CVE: backend 4 CRITICAL/18 HIGH, frontend 6 CRITICAL/29 HIGH (Trivy, 2026-05-16) | 🟠 Yüksek |
| 6 | Grafana alert var ama contact point yok → bildirim gitmiyor | 🟠 Yüksek |
| 7 | Resend domain doğrulanmadı → prod'da şifre sıfırlama e-postası gönderilemez | 🟠 Yüksek |
| 8 | SSL self-signed (Cloudflare Full, Strict değil) | 🟡 Orta |
| 9 | Loki/cAdvisor log rotation yok (bir kez 960 MB'a çıkıp Grafana'yı düşürdü) | 🟡 Orta |
| 10 | Node.js 20 deprecation (CI + Dockerfile) | 🟢 Düşük |

---

## 6. Branch Modeli — Üç Dallı Terfi (2026-08-03'ten itibaren)

```
feat/* ──PR(squash)──► dev ──PR(merge)──► test ──PR(merge)──► main
                        │                  │                    │
                       CI          TEST SUNUCUSU         ileride PRODUCTION
                                (gösterim + QA testi)    (şimdilik sadece tag)
```

| Dal | Rol | Deploy hedefi | Terfi ritmi |
|-----|-----|---------------|-------------|
| `dev` | Günlük entegrasyon | Yok, sadece CI | — |
| `test` | QA / gösterim ortamı | Test sunucusu | İş onaylandıkça |
| `main` | Production'a hazır sürüm | *(prod sunucusu yok)* | Haftalık |

- `main` **default** branch ve production'a ayrılmış. Prod sunucusu kurulana kadar deploy tetiklemez;
  her terfide `release-tag.yml` otomatik `v0.<n>.0` etiketi atar (ilk etiket: `v0.1.0`).
- `test` ve `main` üzerinde **commit üretilmez** — içerikleri yalnızca terfi ile değişir.
  Test ortamında bulunan bug `dev`'den açılan `fix/*` ile düzeltilip yeniden terfi edilir.
- `hotfix/*` → `main` tek istisna; ardından `main → test → dev` geri-merge **zorunlu**.
- `dev` her an çıkılabilir olmalı: erken terfide `dev`'deki her şey birlikte gider.
- Silinen tüm eski branch'ler `archive/<branch-adı>` tag'i olarak korunuyor (28 tag).
- Kurallar: [branching.md](../conventions/branching.md) · Karar geçmişi: [branching-proposal-2026-08.md](../archive/branching-proposal-2026-08.md)

**Not:** 2026-08-03 sabahı kısa süreliğine trunk modeline (`main` tek dal) geçildi, aynı gün
üç dallı modele dönüldü. Gerekçe: test ortamı fiilen müşteriye gösterilen yüzey ve ayrı bir
QA adımı var — dondurulabilir bir dal gerekiyor. Detay: [branch-denetimi-2026-08-03.md](../archive/branch-denetimi-2026-08-03.md) §8–§9.

---

## 7. Squad / Sorumluluk Haritası (frontend)

| Klasör | Sahip | Kapsam |
|--------|-------|--------|
| `features/data-management` | Squad 3 | Ürün, araç, kısıt, import, ERP ekranları |
| `features/planning` | Squad 2 | Plan sihirbazı, optimizasyon, 3D viewer, manuel yerleştirme |
| `features/platform` | Squad 1 | Auth, kullanıcı, billing, ayarlar, rapor, paylaşım |
| `components/shared`, `lib/*` | Ortak | Paylaşılan UI + altyapı |
