# Doküman Haritası

**Son güncelleme:** 2026-08-15 · **Durum:** Aktif

Repodaki tüm `.md` dosyaları, ne içerdikleri ve hangi soruda açılacakları.

---

**Toplam 45 dosya / 11.315 satır** (git ile izlenen tüm `.md` dosyaları, `docs/dokuman-tazeleme` dalı).
Son tarama: **2026-08-15**. Ölçüm komutu — bir sonraki okuyucu bayatlığı böyle kontrol eder:

```bash
git ls-files '*.md' | wc -l                 # → 45
git ls-files '*.md' | xargs wc -l | tail -1 # → 11315
```

> **Revizyon 2026-08-15:** sayım tazelendi (41 → 45 dosya, 10.125 → 11.315 satır; satır sayısı bu tazeleme turunun
> eklediği düzeltme notlarını da içerir). İndekse
> girmemiş 3 ERP dokümanı (`adr-baglanti-mimarisi.md`, `erp-export-kontrati.md`,
> `logo-schema-referans.md`) eklendi. `apps/frontend/e2e/README.md` (Playwright e2e notu)
> bilinçli olarak indeks dışıdır — test klasörü içi teknik not.
>
> **Revizyon 2026-08-13:** indeks yeniden ölçüldü; bayat satır sayıları ve iddialar
> düzeltildi. Yeni girenler: `docs/COORDINATE_STANDARD.md`, `docs/COORDINATE_AUDIT.md`
> (2026-08-12), `devops-audit-raporu.md` ve `.github/SECURITY.md` (2026-08-13).

> **Revizyon 2026-08-08:** doküman yapısı yeniden kuruldu (kök sadeleşti, `docs/archive/`
> açıldı, kebab-case adlandırma, standart şablon). Taşınanlar:
> `PRODUCTION_DEPLOYMENT_INFO.md` → `docs/devops/deployment.md`,
> `docs/conventions/{BRANCHING,COMMITS}.md` → `{branching,commits}.md`,
> `docs/AUDIT-TEST-PLANI.md` → `docs/archive/audit-test-plani-2026-08.md`,
> `docs/context/branching-proposal.md` → `docs/archive/branching-proposal-2026-08.md`,
> 3 algoritma tasarım dokümanı `apps/backend/docs/` → `docs/archive/algoritma-tasarimi/`.
> Yeni: kökte `CONTRIBUTING.md`. Tüm `docs` dokümanlarına standart şablon
> (H1 → `**Son güncelleme:** … · **Durum:** …` → amaç cümlesi → `---`) uygulandı.

---

## Kök

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `README.md` | 101 | Ürün tanıtımı, hızlı başlangıç (3 komut), stack tablosu, repo ağacı, ortam durumu, "Katkı Sağlama" bölümü | Projeye ilk bakış |
| `CONTRIBUTING.md` | 63 | Katkı rehberi: kurulum, üç dallı branch modeli, commit kuralları, kod standartları, PR süreci (**zorunlu review yok** — CI kapıları geçen PR merge edilebilir; UI ekran görüntüsü zorunlu), yeni doküman eklerken güncellenecek dosyalar | Repoya ilk katkıdan önce |
| `SUMMARY.md` | 55 | GitBook içindekiler tablosu. Bölümler: Başlangıç (3), Geliştirme Kuralları (4), DevOps (10), Backend (7), Proje Bağlamı (5), Arşiv (5) | Yeni doküman eklerken (buraya da satır eklenmeli) |
| `CLAUDE.md` | 135 | **Frontend** geliştirme kuralları (AI asistan talimatı). Kapsam, stack, sınırlar, veri kuralları, 3D invariant'ları, kalite kapıları; Git konusunda `docs/conventions/`e yönlendirir | Frontend'e kod yazmadan önce |
| `devops-audit-raporu.md` | 393 | **DevOps denetim raporu (2026-08-13)** — 7 paralel ajanla yapılan denetim; sağlık skoru, rollback/tedarik zinciri/güvenlik görünürlüğü bulguları, öncelik matrisi, "denetim anı → bugünkü durum" karşılaştırması | DevOps risk ve öncelik sorularında — en güncel denetim |

## .github

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `pull_request_template.md` | 32 | Özet / user story / değişiklik tipi / test edildi mi / **Ekran Görüntüleri** / 5 maddelik kontrol listesi | PR açarken |
| `SECURITY.md` | 55 | Güvenlik açığı bildirim politikası (2026-08-13'te eklendi): desteklenen sürümler, GitHub private vulnerability reporting kanalı, 72 saat yanıt taahhüdü, kapsam ve otomatik taramalar | Güvenlik açığı bildirirken |

## docs (kök)

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `COORDINATE_STANDARD.md` | 254 | **Tek yetkili koordinat sistemi tanımı** (2026-08-12): eksen/boyut terimleri, cm birimi, X=width / Y=height / Z=length, kutu origin'i, API sözleşmesi. Çelişki hâlinde bu belge kazanır | 3D, API veya rapor tarafında koordinat/boyut sorusu |
| `COORDINATE_AUDIT.md` | 736 | **Yalnızca rapor** (2026-08-12, sürüm 2) — mevcut frontend/backend kodunun standarda göre denetimi, dosya:satır kanıtlı sapma listesi | Koordinat sapması ararken |

## docs/conventions

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `branching.md` | 298 | **Yürürlükteki** model: üç dallı terfi `dev` → `test` → `main` (2026-08-03'ten itibaren). İş branch'leri `dev`'den açılır, `test`'e yalnızca `dev`'den PR, `main`'e yalnızca `test`/`hotfix`'ten PR; branch türleri ve ≤3 gün ömür kuralı, doğrudan push yasağı (ruleset), PR onay kuralları | Branch/PR açarken. **Tarihsel öneri:** `../archive/branching-proposal-2026-08.md` |
| `commits.md` | 107 | Sade + açıklayıcı mesaj, atomic commit (1 değişiklik = 1 commit), Türkçe tercih, "fix/update/son" gibi mesajlar yasak, PR öncesi geçmiş temizliği | Commit atmadan önce |

## docs/setup

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `local-setup.md` | 275 | Ön koşullar, `.env.test` hazırlama, iki çalışma modu (tam Docker / Vite+Docker hibrit), migration & seed, default login, sık komutlar, 4 sık sorun çözümü | Yeni geliştirici onboarding |

## docs/devops

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `deployment.md` | 176 | Test/prod servis adresleri, compose başlat-durdur komutları, sunucudaki env yolları, migration'ı SDK container'ı ile çalıştırma, container operasyonları, CI/CD akış tablosu, **Production Durumu** (stack hiç deploy edilmedi, `v*` etiketi tüketilmiyor) | Deploy / sunucu operasyonu |
| `server-requirements.md` | 99 | Sunucu donanımı (8 vCPU/16 GB/147 GB), bileşen bazlı CPU-RAM-disk gereksinimleri, ortam-port matrisi, aktif servis listesi | Kapasite planlama |
| `server-access.md` | 252 | SSH erişimi ve yetkili key'ler, UFW port tablosu, fail2ban, nginx reverse proxy path'leri (`/api/`, `/media/`, `/`), ağ diyagramı, monitoring stack başlatma, DIVIZYON ERP DB restore, DB yedekleme cron'ları, GitHub Actions deploy key | Sunucuya bağlanma, ağ/proxy sorunu |
| `secret-management.md` | 223 | "Repoya secret girmez" kuralı, env dosya tablosu, GHCR public durumu, backend local secret yöntemleri (User Secrets / Local JSON), GitHub Actions secret listesi, Google OAuth + Resend değişkenleri, ihlal prosedürü | Secret ekleme/döndürme |
| `monitoring-setup.md` | 248 | Prometheus/Loki/Promtail/Grafana mimarisi, ilk kurulum, toplanan metrikler, alert kuralları, sorun giderme (Loki log şişmesi dahil) | Alert/dashboard işleri |
| `known-issues.md` | 214 | 0–8 numaralı 9 madde; 0 (bayat GHCR kimliği), 5 (prod compose) ve 6 (`dev` gerileme riski) ✅ çözüldü → **fiilen 6 açık**: Resend domain, prod stack, SA parolası, Node 20 uyarısı, log rotation, image CVE'leri + çözülenler tablosu | **Her sprint başında.** Özeti: `project-snapshot.md` §5 |
| `devops-backlog.md` | 245 | 11 maddelik öncelik matrisi + kategori bazlı detay (uyumsuzluklar, eksikler, güncellenecekler, GHCR, operasyonel) | DevOps planlaması |
| `iyilestirme-analizi-2026-08.md` | 850 | **51 bulguluk** kapsamlı devops analizi (2026-08-03): compose, CI/CD, güvenlik, monitoring, doküman tutarsızlıkları; bazı bulgular "doğrulanmadı" işaretli | DevOps iyileştirme planlarken — en güncel ve en detaylı kaynak |

## docs/archive

Yürürlükte olmayan, tarihsel kayıt niteliğindeki dokümanlar. Karar gerekçesi ararken açılır;
güncel davranışın kaynağı değildir.

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `audit-test-plani-2026-08.md` | 502 | `chore/AUDIT-test-birlesik` dalının (AUDIT-01…07, 09, 10, 11) manuel QA test planı: otomatik kapılar (tsc, eslint, vitest, build, `dotnet build`), 26 rotanın duman testi, düzeltme bazlı senaryolar | AUDIT birleşik dalının kapsamını geriye dönük incelerken |
| `branching-proposal-2026-08.md` | 173 | 5 kişilik ekip için önerilen trunk stratejisi. **Yürürlükte değil** — aynı gün geri alındı, üç dallı modele dönüldü | Strateji kararının gerekçesi sorulduğunda |
| `algoritma-tasarimi/matematiksel-model.md` | 440 | **Tasarım arşivi** — bin packing matematiksel modeli (EP, dominance, maliyet fonksiyonu). Kod hem ileride hem geride. Fark listesi: `../kod-taramasi-2026-08.md` §4 | Algoritma tarihçesi |
| `algoritma-tasarimi/sistem-mimarisi.md` | 345 | **Tasarım arşivi** — planlanan packing mimarisi; `PackingEngine` sınıfı hiç yazılmadı, gerçek motor `OptimizationEngine.cs` | Algoritma tarihçesi |
| `algoritma-tasarimi/bin-packing-uygulama-plani.md` | 420 | **Tasarım arşivi** — uygulama faz planı; güncel implementasyonla birebir değil | Algoritma tarihçesi |

## docs/context (bu klasör)

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `README.md` | 39 | Bağlam kütüphanesinin kullanım kuralı, içindekiler tablosu, güncelleme sorumluluğu matrisi | Bu klasöre ilk girişte |
| `project-snapshot.md` | 174 | Stack, ortamlar, portlar, CI/CD, açık riskler, branch modeli, squad haritası — tek sayfa teknik anlık görüntü | **Her oturum başında** |
| `doc-map.md` | bu dosya | Repodaki 45 `.md` dosyasının haritası + özeti + doküman sağlığı tablosu | "Bu bilgi nerede yazıyor?" |
| `kod-taramasi-2026-08.md` | 102 | 6 kategoride kod tabanı taraması (frontend, backend, algoritma, devops, veritabanı, test/kalite): gerçek stack, algoritma analizi, doküman-kod çelişkileri, riskler | Kod gerçeği ile doküman iddiası çeliştiğinde |
| `branch-audit.md` | 308 | 30 remote branch + açık PR analizi ve temizlik kararları. **Durum: uygulandı** — 29 branch → 3, 26 `archive/*` tag'i; §9 yürürlükteki üç dallı modeli anlatır | Branch/PR temizliği yaparken |

## infra

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `infra/env/README.md` | 146 | `.env.*.example` → `.env.*` kopyalama akışı, değişken referansı (genel/DB/MinIO/güvenlik/OAuth/monitoring), güvenlik kuralları, ortam farkları, sunucuda kurulum | Env dosyası hazırlarken |

## apps/backend/docs

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `architecture.md` | 203 | Clean Architecture 4 katman + referans yönü, katman içerikleri, **kararlar:** MediatR Command/Query/Handler (2026-08-04'te kod gerçeğine göre düzeltildi), aggregate-specific repository, FluentValidation, `Result<T>`, composition root. Yeni use-case 8 adımı | Backend'e yeni özellik eklemeden önce |
| `developer-setup.md` | 87 | Visual Studio workload'ları, `global.json` ile SDK pinleme, doğrulama komutları, CI SDK sabitleme | Backend ortam kurulumu |
| `environment-variables.md` | 165 | `Section__SubSection__Key` naming standardı ve neden `__`, yapılandırma öncelik sırası, ortam bazlı secret kaynakları, User Secrets kurulumu, prod bağlantı akışı, secret policy, zorunlu/opsiyonel değişken tablosu | Env var eklerken |
| `database-migrations.md` | 237 | `dotnet-ef` kurulumu, connection string kaynakları, migration üretme/uygulama/geri alma, isimlendirme, ortam bazlı akış, SQL script üretme, 6 yaygın hata | Migration işleri |
| `user-story-tracker.md` | 530 | 17 story'nin alt iş bazında durum takibi (✅/🟡/⬜) + kanıt dosya listesi. Açık kalanlar: Story 8 "validation hatalarını envelope'a bağla", Story 9 correlation id + exception testleri | Backend ilerleme durumu |
| `erp-integration/adr-baglanti-mimarisi.md` | 133 | ERP bağlantı mimarisi kararı (ADR) | ERP bağlantı yaklaşımı sorgulanınca |
| `erp-integration/erp-export-kontrati.md` | 91 | ERP'ye dışa aktarım sözleşmesi (alanlar, format) | ERP export uçlarında |
| `erp-integration/logo-schema-referans.md` | 455 | Logo ERP şema referansı (tablo/kolon envanteri) | Logo alan eşlemesi yaparken |
| `erp-integration/data-model.md` | 59 | `Integration`, `SyncLog`, `ErpUserMapping` entity'leri + `Item`/`Vehicle`'a eklenecek alanlar | ERP entegrasyonu |
| `erp-integration/erp-schema-divizyon.md` | 459 | Müşteri ERP şeması: `TBLSTSABIT` (stok, 134 kolon), `TBLSIPAMAS` (sipariş başlığı, 106), `TBLSIPATRA` (satırlar, 97), boyut birimi notu, sync ve delta-sync sorguları | ERP alan eşlemesi |

## apps/frontend (AI asistan kuralları)

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `.claude/CLAUDE.md` | 598 | **Frontend standartlarının ana kaynağı.** Klasör yapısı, isimlendirme, TS kuralları (enum yerine `as const`), shadcn kuralları, tasarım token'ları, Zustand slice tablosu, TanStack Query kuralları, form + bağımlı alan tuzağı, 3D standartları (koordinat, `BoxWrapper`, Canvas, `InstancedMesh`, dispose, raycasting, katman), routing/RBAC/JWT, abonelik kilit modal pattern'i, PDF/Excel export, `/share/:token` kuralları | Frontend'de herhangi bir dosyaya dokunmadan önce |
| `src/features/data-management/CLAUDE.md` | 49 | Squad 1 — form şeması, bağımlı alan (fragility ≥ 1 → Z rotasyon kilidi), Figma referansı | Ürün/araç/import ekranlarında |
| `src/features/planning/scene/CLAUDE.md` | 141 | Squad 2 — `scene-config.ts`, koordinat & `BoxWrapper`, Canvas, `InstancedMesh` + raycaster, animasyon state machine, `useFrame` kuralları, violation, memory & snapshot | 3D sahnede çalışırken |

---

## Doküman Sağlığı — Tespit Edilen Boşluklar

| Bulgu | Etki |
|-------|------|
| Production CI/CD pipeline'ı yazılı bir süreç olarak yok | 🟡 **Kısmen çözüldü (2026-08-08)** — `docs/devops/deployment.md` § Production Durumu mevcut gerçeği belgeliyor (stack hiç deploy edilmedi, `v*` etiketi hiçbir workflow'u tetiklemiyor). Pipeline'ın kendisi hâlâ yok → **açık** |
| ~~Branch konvansiyonu entegrasyon dalı modelini tarif ediyor, `known-issues.md` #6 bu modelin ayrışma ürettiğini kayıt altına almış~~ | ✅ Çözüldü — `branching.md` üç dallı terfi modelini tarif ediyor, `known-issues.md` #6'nın "Uygulanan çözüm" bölümü `Terfi Zinciri Kontrolü` job'unu ve terfi PR'larında squash yasağını belgeliyor; çelişki kalmadı |
| ~~Algoritma tasarım dokümanları sadece `feature/3D_Packing_Algorithm` branch'inde~~ | ✅ Çözüldü — 1.160 satır PR #888 ile kurtarıldı; 2026-08-08'de `docs/archive/algoritma-tasarimi/` altına taşındı |
| ~~`SUMMARY.md` (GitBook ToC) backend ve ERP dokümanlarını hiç listelemiyor~~ | ✅ Çözüldü (2026-08-08) — SUMMARY 7 bölümle yeniden üretildi; backend (7), devops (8), arşiv (5) dahil 31 doküman listeleniyor |
| ~~PR şablonunda ekran görüntüsü alanı yok~~ | ✅ Çözüldü (2026-08-08) — `pull_request_template.md`'ye "Ekran Görüntüleri" bölümü eklendi (UI PR'larında zorunlu) |
