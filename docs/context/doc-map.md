# Doküman Haritası

**Son güncelleme:** 2026-08-16 · **Durum:** Aktif

Repodaki tüm `.md` dosyaları, ne içerdikleri ve hangi soruda açılacakları.

---

## Güncelleme Sorumluluğu

Hangi olayda hangi bağlam dosyasının güncelleneceğini bu matris tanımlar.
(`CONTRIBUTING.md:58-63` yalnız `SUMMARY.md` + bu dosyayı şart koşar; matris onun üstüne
iki tetikleyici daha ekler. 2026-08-16'da `docs/context/README.md`'den buraya taşındı —
orada tek nüsha duruyordu ve dosya listesiyle birlikte iki ayrı yerde bayatlıyordu.)

| Tetikleyici | Güncellenecek dosya |
|-------------|---------------------|
| Yeni `.md` eklendi / silindi / taşındı | `doc-map.md` (+ `SUMMARY.md`) |
| Ortam, port, servis, CI değişti | `project-snapshot.md` |
| Branch temizliği yapıldı | `docs/archive/branch-denetimi-2026-08-03.md` (karar sütunu → uygulandı) |
| Branch stratejisi değişti | `docs/conventions/branching.md` (+ eski karar kaydı: `docs/archive/branching-proposal-2026-08.md`) |

---

**Toplam 57 dosya / 14.071 satır** (git ile izlenen tüm `.md` dosyaları).
Son tarama: **2026-08-17 (ADR pratiği turu)**. Ölçüm komutu — bir sonraki okuyucu bayatlığı böyle kontrol eder:

```bash
git ls-files '*.md' | wc -l                 # → 57
git ls-files '*.md' | xargs wc -l | tail -1 # → 14071
```

> Önceki ölçüm 2026-08-16'da **47 / 12.342** idi. Aradaki fark yalnız ADR turundan gelmiyor:
> bu tur 7 dosya ekledi (`docs/adr/` altında 6 + `docs/conventions/adr.md`), kalan 3 dosya
> `dev`'e bu iki ölçüm arasında giren işlerden geliyor.

> **Revizyon 2026-08-17 (ADR pratiği):** `docs/adr/` açıldı. Tek mevcut ADR
> (`apps/backend/docs/erp-integration/adr-baglanti-mimarisi.md`) içeriği değiştirilmeden
> `docs/adr/ADR-0001-erp-baglanti-mimarisi.md`'ye taşındı (yalnız başlığa numara eklendi);
> gelen 3 bağlantı düzeltildi. Yeni dosyalar: `docs/adr/README.md` (indeks + kurallar),
> `docs/adr/ADR-0000-sablon.md`, `ADR-0002`…`ADR-0005` (motor kararları),
> `docs/conventions/adr.md`. Başlıktaki sayım bu turda yeniden ölçüldü: 47/12.342 → **57/14.071**.
>
> **Revizyon 2026-08-16 (konsolidasyon):** dosya sayısı değişmedi (**47**), yerleşim değişti.
> `docs/COORDINATE_AUDIT.md`, `docs/devops/iyilestirme-analizi-2026-08.md` ve
> `docs/context/branch-audit.md` `docs/archive/`'a taşındı (üçü de kendini bayat ilan etmişti);
> kökteki `devops-audit-raporu.md` → `docs/devops/denetim-raporu-2026-08-13.md`.
> Arşive taşınan devops analizinin **45 açık D-bulgusu** taşımadan önce
> `devops-backlog.md` Kategori 6'ya triyaj edildi. Hiçbir dosya silinmedi.
> `docs/archive` 5 → **8**, `docs/context` 5 → **4**, repo kökü 5 → **4** `.md`.
>
> **Revizyon 2026-08-15 (ikinci tur):** sayım yeniden ölçüldü (45 → **47** dosya,
> 11.315 → **11.956** satır). Aynı günün erken saatinde yazılan 45/11.315 değeri PR #993
> anına aitti ve #994–#1004 turundan sonra bayatladı. Yeni giren iki dosya:
> `docs/KOORDINAT-UYUM-RAPORU.md` ve `apps/algorithm-test-ui/README.md` — ikisi de aşağıdaki
> indekse eklendi. Ayrıca aşağıdaki tablolardaki **tüm satır sayıları yeniden ölçüldü**
> (`git ls-files '*.md' | xargs wc -l`); 21 girişte kayma vardı, en büyüğü
> `devops-backlog.md` 245 → 333 ve `kod-taramasi-2026-08.md` 102 → 187.
> **Ölçüm notu:** başlıktaki 47/11.956 toplamı `dev` @ `96e9fd8b` üzerinde alınmıştır;
> tablodaki tek tek satır sayıları bu tazeleme turunun kendi eklemelerini de içerdiği için
> toplamları o değerin biraz üzerindedir. Aynı komutu koşan okuyucu ikisini de yeniden ölçer.
>
> **Revizyon 2026-08-15 (birinci tur):** sayım tazelendi (41 → 45 dosya, 10.125 → 11.315 satır; satır sayısı bu tazeleme turunun
> eklediği düzeltme notlarını da içerir). İndekse
> girmemiş 3 ERP dokümanı (`adr-baglanti-mimarisi.md`, `erp-export-kontrati.md`,
> `logo-schema-referans.md`) eklendi. `apps/frontend/e2e/README.md` (Playwright e2e notu)
> bilinçli olarak indeks dışıdır — test klasörü içi teknik not.
>
> **Revizyon 2026-08-13:** indeks yeniden ölçüldü; bayat satır sayıları ve iddialar
> düzeltildi. Yeni girenler: `docs/COORDINATE_STANDARD.md`, `docs/archive/koordinat-denetimi-2026-08-12.md`
> (2026-08-12), `docs/devops/denetim-raporu-2026-08-13.md` ve `.github/SECURITY.md` (2026-08-13).

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
| `SUMMARY.md` | 55 | GitBook içindekiler tablosu. Bölümler: Başlangıç (3), Geliştirme Kuralları (4), DevOps (9), Backend (7), Proje Bağlamı (4), Arşiv (8) | Yeni doküman eklerken (buraya da satır eklenmeli) |
| `CLAUDE.md` | 147 | **Frontend** geliştirme kuralları (AI asistan talimatı). Kapsam, stack, sınırlar, veri kuralları, 3D invariant'ları, kalite kapıları; Git konusunda `docs/conventions/`e yönlendirir | Frontend'e kod yazmadan önce |

Kökte yalnızca konvansiyonel dosyalar durur. `devops-audit-raporu.md` 2026-08-16'da
`docs/devops/denetim-raporu-2026-08-13.md` adıyla `docs/devops/`'a taşındı.

## .github

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `pull_request_template.md` | 32 | Özet / user story / değişiklik tipi / test edildi mi / **Ekran Görüntüleri** / 5 maddelik kontrol listesi | PR açarken |
| `SECURITY.md` | 55 | Güvenlik açığı bildirim politikası (2026-08-13'te eklendi): desteklenen sürümler, GitHub private vulnerability reporting kanalı, 72 saat yanıt taahhüdü, kapsam ve otomatik taramalar | Güvenlik açığı bildirirken |

## docs (kök)

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `COORDINATE_STANDARD.md` | 346 | **Tek yetkili koordinat sistemi tanımı** (2026-08-12, §4/§10 2026-08-16'da güncellendi): eksen/boyut terimleri, cm birimi, **X=width / Y=height / Z=length** (`depth` terimi yasak), kutu origin'i `(min x, min y, min z)`, referans kapı `z = length`, kapı modeli ve arayüz adlandırması, API sözleşmesi. §10 kararların koddaki karşılığını gösterir (hepsi uygulandı). Çelişki hâlinde bu belge kazanır | 3D, API veya rapor tarafında koordinat/boyut sorusu |
| `KOORDINAT-UYUM-RAPORU.md` | 392 | **Yalnızca rapor** (2026-08-15) — 7 alanlı uyum denetimi, 177 tekil dosya:satır bulgusu (24 High). ⚠️ **Bayat** — kapı modeli de kapandı; güncel durum `KOORDINAT-BRANCH-DENETIMI-2026-08-16.md` ve `KOORDINAT-DUZELTME-PLANI.md` | Koordinat uyumsuzluğunun güncel durumunu sorarken |

`docs/coordinate-standard.html` (36 KB) standardın görsel sürümüdür ve `.md` sayımına girmez.

## docs/conventions

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `branching.md` | 298 | **Yürürlükteki** model: üç dallı terfi `dev` → `test` → `main` (2026-08-03'ten itibaren). İş branch'leri `dev`'den açılır, `test`'e yalnızca `dev`'den PR, `main`'e yalnızca `test`/`hotfix`'ten PR; branch türleri ve ≤3 gün ömür kuralı, doğrudan push yasağı (ruleset), PR onay kuralları | Branch/PR açarken. **Tarihsel öneri:** `../archive/branching-proposal-2026-08.md` |
| `commits.md` | 107 | Sade + açıklayıcı mesaj, atomic commit (1 değişiklik = 1 commit), Türkçe tercih, "fix/update/son" gibi mesajlar yasak, PR öncesi geçmiş temizliği | Commit atmadan önce |
| `adr.md` | 43 | ADR kuralı: ne zaman ADR yazılır, `ADR-NNNN` numaralandırma (numara geri kullanılmaz), 4 durum değeri, "eski ADR düzenlenmez, yenisi yazılır" kuralı. Ayrıntı ve indeks `docs/adr/README.md` | Mimari bir karar alırken |

## docs/adr

Geri alınması pahalı teknik kararların gerekçe kaydı. Kod "ne", ADR "neden" ve
"hangi alternatif neden elendi" sorusunu cevaplar.

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `README.md` | 100 | **ADR indeksi (0001–0009) + pratiğin kuralları:** ne zaman ADR yazılır, numaralandırma (numara geri kullanılmaz), durum değerleri, değiştirme yordamı, zorunlu bölümler, kanıt disiplini | ADR yazmadan / ararken önce burası |
| `ADR-0000-sablon.md` | 56 | Boş ADR şablonu — yeni ADR bu dosya kopyalanarak açılır | Yeni ADR açarken |
| `ADR-0001-erp-baglanti-mimarisi.md` | 133 | ERP bağlantı mimarisi: MVP'de doğrudan MSSQL okuma, geri yazımın doğrudan tabloya yapılmaması, resmî API'lerin ertelenmesi, salt-okunur hesap. 2026-08-17'de `apps/backend/docs/erp-integration/adr-baglanti-mimarisi.md`'den taşındı | ERP bağlantı yaklaşımı sorgulanınca |
| `ADR-0002-optimizasyon-motoru-modulerlestirme.md` | 151 | Motorun Infrastructure → Application taşınması ve 7 dosyaya bölünmesi. **Bölme biçimi arayüz/plugin değil, statik fonksiyonlardır** — sıcak döngüye dolaylı çağrı eklenmedi. Bölmeden önce 16 snapshot yazıldı | Motora soyutlama/interface eklemek akla geldiğinde |
| `ADR-0003-lifo-bolge-sert-kisiti.md` | 156 | LIFO bölge cezası (2 000) yerçekiminden (1 000 000) 500× zayıftı. Çözüm: iki kademeli sert kısıt, katsayı 2 000'de kaldı. Katsayı büyütme ve koşulsuz eleme **ölçülerek** elendi | LIFO bölge katsayısı / sert kısıt tartışılınca |
| `ADR-0004-denge-takasi-cift-yonlu-dogrulama.md` | 204 | `if (a.H != b.H)` eşit yükseklikli takaslarda destek kontrolünü atlıyordu → havada kutu. `othersA`/`othersB` + `ViolatesLoadAbove`. %43 yavaşlama bilinçli kabul. PR #997 düzeltmeyi neredeyse geri getiriyordu | `BalanceScoring.SwapIsValid`'e dokunmadan önce — **zorunlu** |
| `ADR-0005-modul-bayraklari-disa-kapali.md` | 133 | `OptimizationModules` bayrakları kodda hazır ama API/arayüze açılmadı: 4 bayrak 16 kombinasyon üretir, katsayılar yalnız 3 kriter için kalibre. Handler'lar `Modules: null` verir → üretim davranışı değişmedi | "Bu bayrakları neden kullanıcıya açmıyoruz?" sorusunda |

## docs/setup

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `local-setup.md` | 275 | Ön koşullar, `.env.test` hazırlama, iki çalışma modu (tam Docker / Vite+Docker hibrit), migration & seed, default login, sık komutlar, 4 sık sorun çözümü | Yeni geliştirici onboarding |

## docs/devops

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `denetim-raporu-2026-08-13.md` | 522 | **DevOps denetim raporu (2026-08-13)** — 7 paralel ajanla yapılan denetim; sağlık skoru, rollback/tedarik zinciri/güvenlik görünürlüğü bulguları, öncelik matrisi, "denetim anı → bugünkü durum" karşılaştırması. 2026-08-16'da repo kökünden buraya taşındı | DevOps risk ve öncelik sorularında — en güncel denetim |
| `deployment.md` | 176 | Test/prod servis adresleri, compose başlat-durdur komutları, sunucudaki env yolları, migration'ı SDK container'ı ile çalıştırma, container operasyonları, CI/CD akış tablosu, **Production Durumu** (stack hiç deploy edilmedi, `v*` etiketi tüketilmiyor) | Deploy / sunucu operasyonu |
| `server-requirements.md` | 99 | Sunucu donanımı (8 vCPU/16 GB/147 GB), bileşen bazlı CPU-RAM-disk gereksinimleri, ortam-port matrisi, aktif servis listesi | Kapasite planlama |
| `server-access.md` | 252 | SSH erişimi ve yetkili key'ler, UFW port tablosu, fail2ban, nginx reverse proxy path'leri (`/api/`, `/media/`, `/`), ağ diyagramı, monitoring stack başlatma, DIVIZYON ERP DB restore, DB yedekleme cron'ları, GitHub Actions deploy key | Sunucuya bağlanma, ağ/proxy sorunu |
| `secret-management.md` | 223 | "Repoya secret girmez" kuralı, env dosya tablosu, GHCR public durumu, backend local secret yöntemleri (User Secrets / Local JSON), GitHub Actions secret listesi, Google OAuth + Resend değişkenleri, ihlal prosedürü | Secret ekleme/döndürme |
| `monitoring-setup.md` | 257 | Prometheus/Loki/Promtail/Grafana mimarisi, ilk kurulum, toplanan metrikler, alert kuralları, sorun giderme (Loki log şişmesi dahil) | Alert/dashboard işleri |
| `known-issues.md` | 229 | 0–8 numaralı 9 madde; 0 (bayat GHCR kimliği), 5 (prod compose) ve 6 (`dev` gerileme riski) ✅ çözüldü → **fiilen 6 açık**: Resend domain, prod stack, SA parolası, Node 20 uyarısı, log rotation, image CVE'leri + çözülenler tablosu | **Her sprint başında.** Özeti: `project-snapshot.md` §5 |
| `devops-backlog.md` | 508 | 18 maddelik öncelik matrisi + kategori bazlı detay (uyumsuzluklar, eksikler, güncellenecekler, GHCR, operasyonel) ve **Kategori 6** — 2026-08-03 taramasının 45 açık D-bulgusu, D-kodları korunarak | DevOps planlaması — **açık DevOps işi için tek canlı kaynak** |

## docs/archive

Yürürlükte olmayan, tarihsel kayıt niteliğindeki dokümanlar. Karar gerekçesi ararken açılır;
güncel davranışın kaynağı değildir.

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `audit-test-plani-2026-08.md` | 502 | `chore/AUDIT-test-birlesik` dalının (AUDIT-01…07, 09, 10, 11) manuel QA test planı: otomatik kapılar (tsc, eslint, vitest, build, `dotnet build`), 26 rotanın duman testi, düzeltme bazlı senaryolar | AUDIT birleşik dalının kapsamını geriye dönük incelerken |
| `branching-proposal-2026-08.md` | 175 | 5 kişilik ekip için önerilen trunk stratejisi. **Yürürlükte değil** — aynı gün geri alındı, üç dallı modele dönüldü | Strateji kararının gerekçesi sorulduğunda |
| `koordinat-denetimi-2026-08-12.md` | 742 | **Yalnızca rapor** (2026-08-12, sürüm 2) — kodun o günkü standarda göre denetimi, dosya:satır kanıtlı sapma listesi. ⚠️ **Bayat** — `KOORDINAT-UYUM-RAPORU.md` bunun yerini aldı, z-yönü/`depth` bulguları artık geçersiz. **Tekil değeri:** §3 "standarda uygun dosyalar" ve §4 "artık uyumlu — dokunulmayacak" listeleri | Doğru olan kodu bozmamak için düzeltmeden önce · tarihsel karşılaştırma |
| `devops-iyilestirme-analizi-2026-08.md` | 864 | **51 bulguluk** devops taraması (2026-08-03): compose, CI/CD, güvenlik, monitoring, doküman tutarsızlıkları. ⚠️ **Anlık görüntü, canlı değil.** 2026-08-16 triyajında 6 bulgu kapandı, 45'i `devops-backlog.md` Kategori 6'ya taşındı | Bir D-bulgusunun kanıt gövdesini okurken — **açık iş listesi için değil** |
| `branch-denetimi-2026-08-03.md` | 308 | 30 remote branch + açık PR analizi ve temizlik kararları. **Uygulandı** ve envanteri bayat (bugün 20 dal). **Tekil değeri:** §7 kök neden + §8 trunk geçişinin neden geri alındığı | "Neden trunk'a geçmiyoruz?" sorusunda |
| `algoritma-tasarimi/matematiksel-model.md` | 442 | **Tasarım arşivi** — bin packing matematiksel modeli (EP, dominance, maliyet fonksiyonu). Kod hem ileride hem geride. Fark listesi: `../kod-taramasi-2026-08.md` §4 | Algoritma tarihçesi |
| `algoritma-tasarimi/sistem-mimarisi.md` | 348 | **Tasarım arşivi** — planlanan packing mimarisi; `PackingEngine` sınıfı hiç yazılmadı, gerçek motor `Application/Common/Optimization/` (7 dosya) | Algoritma tarihçesi |
| `algoritma-tasarimi/bin-packing-uygulama-plani.md` | 422 | **Tasarım arşivi** — uygulama faz planı; güncel implementasyonla birebir değil | Algoritma tarihçesi |

## docs/context (bu klasör)

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `README.md` | 30 | Klasörün giriş sayfası: okuma sırası (kullanım kuralı) ve `doc-map`'e yönlendirme. Dosya listesi ve güncelleme sorumluluğu matrisi 2026-08-16'da buraya taşındı — tekrar bırakılmadı | Bu klasöre ilk girişte |
| `project-snapshot.md` | 174 | Stack, ortamlar, portlar, CI/CD, açık riskler, branch modeli, squad haritası — tek sayfa teknik anlık görüntü | **Her oturum başında** |
| `doc-map.md` | bu dosya | Repodaki 47 `.md` dosyasının haritası + özeti + doküman sağlığı tablosu | "Bu bilgi nerede yazıyor?" |
| `kod-taramasi-2026-08.md` | 187 | 6 kategoride kod tabanı taraması (frontend, backend, algoritma, devops, veritabanı, test/kalite): gerçek stack, algoritma analizi, doküman-kod çelişkileri, riskler | Kod gerçeği ile doküman iddiası çeliştiğinde |

## infra

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `infra/env/README.md` | 146 | `.env.*.example` → `.env.*` kopyalama akışı, değişken referansı (genel/DB/MinIO/güvenlik/OAuth/monitoring), güvenlik kuralları, ortam farkları, sunucuda kurulum | Env dosyası hazırlarken |

## apps/backend/docs

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `architecture.md` | 231 | Clean Architecture 4 katman + referans yönü, katman içerikleri, **kararlar:** MediatR Command/Query/Handler (2026-08-04'te kod gerçeğine göre düzeltildi), aggregate-specific repository, FluentValidation, `Result<T>`, composition root. Yeni use-case 8 adımı | Backend'e yeni özellik eklemeden önce |
| `developer-setup.md` | 87 | Visual Studio workload'ları, `global.json` ile SDK pinleme, doğrulama komutları, CI SDK sabitleme | Backend ortam kurulumu |
| `environment-variables.md` | 165 | `Section__SubSection__Key` naming standardı ve neden `__`, yapılandırma öncelik sırası, ortam bazlı secret kaynakları, User Secrets kurulumu, prod bağlantı akışı, secret policy, zorunlu/opsiyonel değişken tablosu | Env var eklerken |
| `database-migrations.md` | 248 | `dotnet-ef` kurulumu, connection string kaynakları, migration üretme/uygulama/geri alma, isimlendirme, ortam bazlı akış, SQL script üretme, 6 yaygın hata | Migration işleri |
| `user-story-tracker.md` | 541 | 17 story'nin alt iş bazında durum takibi (✅/🟡/⬜) + kanıt dosya listesi. Açık kalanlar: Story 8 "validation hatalarını envelope'a bağla", Story 9 correlation id + exception testleri | Backend ilerleme durumu |
| `erp-integration/erp-export-kontrati.md` | 91 | ERP'ye dışa aktarım sözleşmesi (alanlar, format) | ERP export uçlarında |
| `erp-integration/logo-schema-referans.md` | 455 | Logo ERP şema referansı (tablo/kolon envanteri) | Logo alan eşlemesi yaparken |
| `erp-integration/data-model.md` | 102 | `Integration`, `SyncLog`, `ErpUserMapping` entity'leri + `Item`/`Vehicle`'a eklenecek alanlar | ERP entegrasyonu |
| `erp-integration/erp-schema-divizyon.md` | 481 | Müşteri ERP şeması: `TBLSTSABIT` (stok, 134 kolon), `TBLSIPAMAS` (sipariş başlığı, 106), `TBLSIPATRA` (satırlar, 97), boyut birimi notu, sync ve delta-sync sorguları | ERP alan eşlemesi |

## apps/frontend (AI asistan kuralları)

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `.claude/CLAUDE.md` | 605 | **Frontend standartlarının ana kaynağı.** Klasör yapısı, isimlendirme, TS kuralları (enum yerine `as const`), shadcn kuralları, tasarım token'ları, Zustand slice tablosu, TanStack Query kuralları, form + bağımlı alan tuzağı, 3D standartları (koordinat, `BoxWrapper`, Canvas, `InstancedMesh`, dispose, raycasting, katman), routing/RBAC/JWT, abonelik kilit modal pattern'i, PDF/Excel export, `/share/:token` kuralları | Frontend'de herhangi bir dosyaya dokunmadan önce |
| `src/features/data-management/CLAUDE.md` | 53 | Squad 1 — form şeması, bağımlı alan (fragility ≥ 1 → Z rotasyon kilidi), Figma referansı | Ürün/araç/import ekranlarında |
| `src/features/planning/scene/CLAUDE.md` | 197 | Squad 2 — `scene-config.ts`, koordinat & `BoxWrapper`, Canvas, `InstancedMesh` + raycaster, animasyon state machine, `useFrame` kuralları, violation, memory & snapshot | 3D sahnede çalışırken |

## apps/algorithm-test-ui

| Dosya | Satır | Özet | Şu soruda aç |
|-------|------:|------|--------------|
| `README.md` | 247 | Algoritma test/deneme arayüzünün kullanım notu (2026-08-15'te repoya girdi) | Motor davranışını elle denerken |

---

## Doküman Sağlığı — Tespit Edilen Boşluklar

| Bulgu | Etki |
|-------|------|
| Production CI/CD pipeline'ı yazılı bir süreç olarak yok | 🟡 **Kısmen çözüldü (2026-08-08)** — `docs/devops/deployment.md` § Production Durumu mevcut gerçeği belgeliyor (stack hiç deploy edilmedi, `v*` etiketi hiçbir workflow'u tetiklemiyor). Pipeline'ın kendisi hâlâ yok → **açık** |
| ~~Branch konvansiyonu entegrasyon dalı modelini tarif ediyor, `known-issues.md` #6 bu modelin ayrışma ürettiğini kayıt altına almış~~ | ✅ Çözüldü — `branching.md` üç dallı terfi modelini tarif ediyor, `known-issues.md` #6'nın "Uygulanan çözüm" bölümü `Terfi Zinciri Kontrolü` job'unu ve terfi PR'larında squash yasağını belgeliyor; çelişki kalmadı |
| ~~Algoritma tasarım dokümanları sadece `feature/3D_Packing_Algorithm` branch'inde~~ | ✅ Çözüldü — 1.160 satır PR #888 ile kurtarıldı; 2026-08-08'de `docs/archive/algoritma-tasarimi/` altına taşındı |
| ~~`SUMMARY.md` (GitBook ToC) backend ve ERP dokümanlarını hiç listelemiyor~~ | ✅ Çözüldü (2026-08-08) — SUMMARY 7 bölümle yeniden üretildi; backend, devops ve arşiv dokümanları dahil edildi |
| `SUMMARY.md` indeksi 47 dosyanın 36'sını kapsıyor | 🟡 **Açık, düşük öncelik** (ölçüm 2026-08-16: `grep -oE '\]\([^)]+\)' SUMMARY.md \| wc -l` → 36 bağlantı; `git ls-files '*.md'` → 47). `docs/` altındaki **24 dosyanın tamamı artık ToC'de** — `KOORDINAT-UYUM-RAPORU.md` bu turda eklendi. Kapsam dışı kalan 10 dosya: 4 `CLAUDE.md` (AI asistan talimatı), `pull_request_template.md`, `apps/frontend/e2e/README.md`, `apps/algorithm-test-ui/README.md`, 3 ERP dokümanı (`adr-baglanti-mimarisi`, `erp-export-kontrati`, `logo-schema-referans`). İlk yedisi bilinçli dışlama; 3 ERP dokümanı **eklenmeli**. **2026-08-17 yeniden ölçüm:** `grep -oE '\]\([^)]+\)' SUMMARY.md \| wc -l` → **44** bağlantı / `git ls-files '*.md'` → **57** dosya. ERP ADR'si `docs/adr/ADR-0001-erp-baglanti-mimarisi.md` olarak taşındı ve ToC'ye girdi; yeni `docs/adr/` (6 dosya) ve `docs/conventions/adr.md` de eklendi. Kalan 2 ERP dokümanı (`erp-export-kontrati`, `logo-schema-referans`) hâlâ açık |
| ~~PR şablonunda ekran görüntüsü alanı yok~~ | ✅ Çözüldü (2026-08-08) — `pull_request_template.md`'ye "Ekran Görüntüleri" bölümü eklendi (UI PR'larında zorunlu) |
