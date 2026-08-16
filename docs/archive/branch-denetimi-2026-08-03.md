# Branch & PR Denetimi

{% hint style="info" %}
**🗄 Arşiv — 2026-08-16'da `docs/context/`'ten buraya taşındı.**

**Neden arşivde:** Tek seferlik bir temizlik denetimidir ve **uygulanmıştır** (§1–§6).
Envanter tablosu bugün geçerli değil — 2026-08-16 ölçümü: **20 remote branch** (belge "3"
diyor), **28 `archive/*` tag'i** (belge "26" diyor), **0 açık PR** (belge "2" diyor).

**Silinmedi çünkü:** §7 (kök neden) ve §8 (trunk geçişi ve neden geri alındığı) repodaki
**tekil kayıttır** — "neden trunk'a geçmiyoruz?" sorusunun tek gerekçe belgesi. §9'daki üç
dallı modelin yürürlükteki hâli ise
[`branching.md`](../conventions/branching.md) ve
[`project-snapshot.md`](../context/project-snapshot.md) §6'dadır; **çelişki hâlinde onlar kazanır.**

**Yansıttığı durum:** 2026-08-03, `origin/test` @ `3c42f65a`.
{% endhint %}

**Son güncelleme:** 2026-08-03 · **Durum:** 🗄 Arşiv (uygulandı)

30 remote branch ve açık PR'ların denetimi, temizlik kararları ve uygulanan üç dallı terfi modelinin kaydı.

---

**Tarih:** 2026-08-03 · **Referans:** `origin/test` @ `3c42f65a` (denetim anı)
**Durum:** ✅ **Tamamlandı ve uygulandı.** Sonuç: **29 branch → 3** (`main`, `test`, `dev`),
26 `archive/*` tag'i, açık PR yok. Ardından trunk geçişi yapıldı (§8), aynı gün üç dallı
terfi modeline dönüldü (§9) — **yürürlükteki model §9'dur.**

---

## 1. Özet

| Ölçüt | Değer |
|-------|------:|
| Remote branch | 29 |
| Uzun ömürlü branch | 3 (`main`, `test`, `dev`) |
| İş branch'i | 26 |
| Açık PR | 2 (ikisi de aynı branch'ten, ikisi de CONFLICTING) |
| En eski açık branch | 2026-04-28 (97 gün) |
| Doğrudan silinebilir (içeriği `test`'te) | 7 |
| Eskimiş / yerini almış, silinebilir | 11 |
| Silinebilir ama işi backlog'a taşınmalı | 4 |
| **Kurtarılması gereken gerçek iş** | **4** |

**Ana bulgu:** `dev` ile `test` **içerik olarak birebir aynı** — `dev` risksiz kapatılabilir (§3.1).

---

## 2. Açık PR'lar

| PR | Branch | Hedef | Durum | Sonuç |
|----|--------|-------|-------|-------|
| #835 | `feature/US-XXX-coklu-arac` | `test` | CONFLICTING · 49 dosya · +4184/−671 | ✅ Yazarı kapattı (2026-08-03) |
| #834 | `feature/US-XXX-coklu-arac` | `dev` | CONFLICTING · aynı diff | ✅ Yazarı kapattı (2026-08-03) |

Branch **silinmedi** — içeriği kurtarılacak (§5).

**Gerekçe:** Branch `test`'in 161 commit gerisinde, iki PR da conflict veriyor ve branch'in son commit'i
`Revert "branch içerigi test ile hizalandi ve ci derleme hatalari giderildi"` — yani hizalama denemesi
geri alınmış durumda. Bu haliyle merge edilemez.
**Ama içerik gerçek:** `LoadingPlanVehicle` entity'si, çoklu araç migration'ı ve ilgili frontend
`test`'te **yok**. Öneri: PR'ları kapat, işi `test`'ten açılan taze bir branch'e yeniden uygula (§5).

> Bu iki PR, mevcut "her iş için 2 PR" modelinin maliyetinin somut örneği: aynı diff iki kez
> review kuyruğunda bekliyor.

---

## 3. Uzun Ömürlü Branch'ler

| Branch | test'e göre | Durum |
|--------|-------------|-------|
| `test` | — | Default branch. `test-protection` ruleset'i (1 review + 3 required check). Aktif, güncel. |
| `dev` | 3 geride / 9 önde (hepsi merge commit) | **İçerik `test` ile birebir aynı.** `dev-protection` ruleset'i (1 review + 1 check). |
| `main` | 2051 geride / 0 önde | 2026-04-11'den beri dokunulmamış. `main-protection` ruleset'i var ama **required status check yok**. Production hiç deploy edilmedi. |

> ⚠️ İlk taramada `main` ve `dev` "korumasız" diye kaydedilmişti. Yanlıştı: koruma klasik branch
> protection ile değil **repository ruleset** ile tanımlı ve
> `GET /repos/.../branches/<b>/protection` bu durumda 404 döner. Doğru sorgu:
> `GET /repos/.../rules/branches/<b>`.

### 3.1 `dev` — `test` ile içerik farkı yok ✅

```
$ git diff origin/test origin/dev --stat
(çıktı boş)
```

İki branch'in **çalışma ağaçları birebir aynı**. `dev`'de görünen 9 fazla commit'in tamamı merge
commit'i veya içeriği `test`'e başka bir branch üzerinden ulaşmış commit
(ör. `loadingType` düzeltmeleri `test`'e #874 ile girdi).

**Aksiyon:** `dev`'de kurtarılacak iş yok. Branch kapatıldığında kod kaybı olmaz.

> ⚠️ **Metodoloji notu — ilk analizde yapılan hata.** `test` ile `dev` arasında **iki merge-base**
> var. Bu durumda `git diff A...B` (üç nokta) merge-base'lerden birini keyfî seçer ve gerçekte var
> olmayan bir fark üretir. İlk taramada bu yolla "dev'de kalan refresh-token düzeltmesi" tespit
> edilmişti; `git diff A B` (iki nokta) ile doğrulandığında farkın olmadığı görüldü.
> **Kural: branch karşılaştırmasında iki nokta kullan, ya da dosya varlığını `git cat-file -e` ile doğrula.**
> Bu dokümandaki diğer "test'te var/yok" tespitleri `cat-file` ile yapıldığından bu hatadan etkilenmez.

### 3.2 `main`

`main`, `test`'in tam atası — yani içerik olarak `git push origin test:main` **fast-forward**'dır,
birleştirme çakışması yok. Ancak `main-protection` ruleset'indeki `update` kuralı doğrudan push'u
engeller; güncelleme ya PR ile ya da bypass yetkisiyle yapılmalı.

Eksik: `main`'de required status check tanımlı değil — CI geçmeden merge edilebilir durumda.

---

## 4. Silinebilir Branch'ler

### 4.1 İçeriği zaten `test`'te — risk yok (7)

| Branch | Kanıt |
|--------|-------|
| `copilot/investigate-server-http-500` | 0 benzersiz commit |
| `feature/US-3D-01-3d-sahne-arac-onizleme` | 0 benzersiz commit |
| `feature/US-USR-01-user-management-profile` | 0 benzersiz commit |
| `feature/US-VY-29-3d-arac-silüet-onizleme` | 0 benzersiz commit · PR #404/#405 merged |
| `feature/US-VY-99-arac-kapi-yonu` | 0 benzersiz commit |
| `feature/BE-3D-03-3-optimization-integration` | Patch `test`'te mevcut (`git cherry` −) |
| `feature/erp-kaynak-badge-ve-paylasim-duzeltmeleri` | Patch `test`'te mevcut · PR #778/#780 merged |

### 4.2 Yerini alan iş `test`'e girmiş — eskimiş (11)

| Branch | Yaş / geride | Neden eskimiş |
|--------|-------------|---------------|
| `bugfix/US-AUTH-03-US-AUTH-04-endpoint-fix` | 1515 | Google OAuth `test`'te kurulu (`GoogleOAuthService`), `useAuth.ts` mevcut |
| `feature/US-VY-27-final2` | 1315 | `GetVehicleByIdQuery` `test`'te var |
| `feature/US-VY-27-get-vehicle-by-id` | 1314 | Aynı işin ikinci kopyası — aynı story için 2 branch |
| `feature/US-VY-INF-15-urun-havuzu-listeleme` | 1624 | `SearchItems` akışı yerini aldı · PR #227/#228 CLOSED |
| `feature/BE-NTF-01-4-5-rbac-policy-hangfire-setup` | 1100 | `NotificationVisibilityPolicy` ve Hangfire `test`'te mevcut |
| `feature/US-3D-XX-door-panel-mesh-visual` | 1076 | `ContainerMesh`/`ContainerBody` `test`'te defalarca değişti, rebase maliyeti > değeri |
| `feat/3D-container-steel-texture-floor-grid` | 1129 | `SceneFloor` `test`'te var. Ayrıca **8 MB binary texture** taşıyor — bu dosyalar repoya değil LFS/CDN'e ait |
| `feature/3D_Packing_Algorithm` | 1327 | `test`'teki `OptimizationEngine` extreme-point + CoG + grup zone'lu tam implementasyon; branch'teki `PackingEngine` iskeleti geride kaldı. ⚠️ **Önce dokümanları kurtar** (aşağı bak) |
| `copilot/investigate-door-direction-issue` | 50 | Kapı yönü düzeltmesi `test`'e #874 ile ayrıca geldi. PR #861 ve #867 CLOSED. ⚠️ Branch 3 migration dosyasını siliyor (−2873 satır) — merge edilmesi tehlikeli |
| `copilot/fix-ci-cd-errors-another-one` | 44 | PR hiç açılmamış. İçinde `test-deploy.yml`'e *copilot branch muafiyeti* var — kalıcı olmamalı |
| `copilot/resolve-conflicts-with-test-branch` | 161 | PR hiç açılmamış. Commit mesajı `Changes before error encountered` — yarım kalmış otomatik conflict çözümü, 72 dosya |

> ⚠️ **Silmeden önce kurtarılacak:** `feature/3D_Packing_Algorithm` branch'i şu üç dosyayı
> içeriyor ve bunlar `test`'te yok:
> `docs/archive/algoritma-tasarimi/matematiksel-model.md` (425 satır),
> `docs/archive/algoritma-tasarimi/sistem-mimarisi.md` (330),
> `docs/archive/algoritma-tasarimi/bin-packing-uygulama-plani.md` (405).
> Toplam 1.160 satır algoritma tasarım dokümanı.
> ✅ **Kurtarıldı:** PR #888 (`chore/algoritma-tasarim-dokumanlari`). Merge edildikten sonra
> `feature/3D_Packing_Algorithm` güvenle silinebilir.

### 4.3 Branch silinsin, iş backlog'a taşınsın (4)

Bu dörtte iş **gerçekten `test`'te yok** ama branch'ler o kadar geride ki rebase maliyeti
sıfırdan yazmaktan yüksek. Branch'i saklamak kimseyi kurtarmıyor; story'yi saklamak kurtarıyor.

| Branch | Geride | `test`'te eksik olan | Backlog kaydı |
|--------|-------:|----------------------|---------------|
| `feature/US-AUTH-05-hesap-kitleme-mekanizması` | 1666 | IP bazlı lockout (`IpLoginAttempt`). Kullanıcı bazlı lockout (5 deneme / 15 dk) `test`'te **var** | "IP bazlı brute-force koruması" — kalan iş küçük |
| `feature/US-VY-DAT-01-item-list-api` | 1659 | `DimensionUnit` / `WeightUnit` / `StockStatus` alanları ve cm/kg normalizasyonu | "Ürün birim normalizasyonu + stok durumu" |
| `feature/US-VY-36-erp-vehicle-upsert-clean` | 970 | `PendingVehicleMapping` entity'si, ERP araç upsert + approve endpoint'i | "ERP araç senkronizasyonu" — `docs/erp-integration/` ile birlikte planlanmalı |
| `feature/US-SUB-02-paytr-subscription-backend` | 656 | PayTR ödeme entegrasyonunun tamamı (`test`'te "PayTR" kelimesi hiç geçmiyor) | "Abonelik/ödeme" — önce ürün kararı: bu sürümde var mı? |

---

## 5. Kurtarılması Gereken İş (4)

Bunlar silinmeden önce sahipleriyle konuşulmalı.

| Branch | Sahip | Ne var | Öneri |
|--------|-------|--------|-------|
| `feature/lifo-kapi-zekasi-eklendi` | İbrahim Nuryağınlı | LIFO algoritmasının kapı yönüne göre zone + skor hesabı, `SideBoth` kapı tipinin kaldırılması, `DebugStepPanel` (yerleştirme adım debug paneli). 12 commit, sadece 206 geride — **en taze iş** | `test`'ten yeni branch, 12 commit'i **tek commit'e squash** (10'u prettier/TS düzeltmesi), PR aç |
| `feature/US-XXX-coklu-arac` | Çağrı Tekin / İbrahim N. | Çoklu araç desteği: `LoadingPlanVehicle` entity + migration + plan UI. Açık PR #834/#835 | PR'ları kapat, işi `test` üzerine yeniden uygula, tek PR aç |
| `feature/US-XXX-container-collision-rear-door` | şeyma | PR #522/#523 merge edildikten **sonra** eklenen 5 commit: `/share` sayfasına salt-okunur 3D viewer (`test`'teki `SharePage.tsx`'te Canvas yok), kamera preset sadeleştirmesi | 3D viewer parçası değerli — ayrı branch'e taşınıp PR açılmalı |
| `bugfix/Responsive` | akgunege1 | PR #698/#701 merge edildikten sonra 1 commit: `LandingPage`'de `CraneAnimation` sarmalayıcılarına `z-10` (2 satır) | ⚠️ Mekanik cherry-pick değil: `test`'te bu blok yeniden yazılmış (konum `top-1/2`→`top-0`, boyut `288×480`→`500×780`). Frontend geliştirici güncel `test`'te hatanın hâlâ olup olmadığına bakmalı; varsa tek satırlık yeni fix |

---

## 6. Önerilen Uygulama Sırası

Her adım ayrı ve geri alınabilir tutulmalı.

| # | Adım | Risk | Durum |
|---|------|------|-------|
| 1 | `feature/3D_Packing_Algorithm`'daki 3 algoritma dokümanını `test`'e al | Yok — sadece doküman | ✅ PR #888 açıldı, CI yeşil, review bekliyor |
| 2 | §4.1'deki 7 branch'i sil | Yok | ✅ Silindi (2026-08-03) |
| 3 | §4.2'deki 11 branch'i sil | Düşük | ✅ Silindi (2026-08-03) |
| 4 | Açık PR #834/#835'i kapat | Düşük | ✅ Yazarı (cagr1tekin) kapattı |
| 5 | §5'teki 4 branch için sahipleriyle karar | Yok | ⏳ Ekipte |
| 6 | §4.3'teki 4 story'yi backlog'a yaz, sonra branch'leri sil | Düşük | ⏳ |
| 7 | `delete_branch_on_merge` ayarını **açık** hale getir | Yok — birikmeyi kökten keser | ⏳ |
| 8 | Branch stratejisi kararı → [branching-proposal-2026-08.md](branching-proposal-2026-08.md) | — | ⏳ |

> `dev`'de kurtarılacak iş bulunmadığı için (§3.1) ayrı bir taşıma adımı gerekmiyor.

### 6.1 Uygulama Kaydı — 2026-08-03

**Sonuç: 29 branch → 3.** Kalan: `main`, `test`, `dev`.

| Aşama | Ne yapıldı |
|-------|-----------|
| 1 | §4.1'den 7 + §4.2'den 11 = **18 branch** arşivlenip silindi |
| 2 | Kullanıcı `bugfix/Responsive`, `US-XXX-coklu-arac`, `US-XXX-container-collision-rear-door`'u UI'dan sildi — objeler lokalde yakalanıp sonradan tag'lendi |
| 3 | Kalan **5 branch** (§4.3'ün 4'ü + `lifo-kapi-zekasi-eklendi`) arşivlenip silindi |
| 4 | PR #888/#889 → `dev`, #890/#891 → `test` merge edildi |
| 5 | `delete_branch_on_merge` **açıldı** |

**26 `archive/*` tag'i** push edildi. Hiçbir commit kaybolmadı. Geri alma:

```bash
git fetch --tags
git checkout -b <yeni-branch-adi> archive/<eski-branch-adi>
```

{% hint style="warning" %}
Kurtarma kararı verilmeden silinen, `test`'te karşılığı olmayan işler — ihtiyaç olursa tag'lerden alınır:

- `archive/feature/lifo-kapi-zekasi-eklendi` — LIFO kapı zekası + `DebugStepPanel` (sadece 206 commit gerideydi)
- `archive/feature/US-XXX-coklu-arac` — `LoadingPlanVehicle` entity + çoklu araç migration'ı
- `archive/feature/US-XXX-container-collision-rear-door` — `/share` sayfası salt-okunur 3D viewer
- `archive/feature/US-SUB-02-paytr-subscription-backend` — PayTR ödeme entegrasyonu
- `archive/feature/US-VY-36-erp-vehicle-upsert-clean` — ERP araç upsert + `PendingVehicleMapping`
- `archive/feature/US-VY-DAT-01-item-list-api` — ürün birim normalizasyonu + stok durumu
- `archive/feature/US-AUTH-05-hesap-kitleme-mekanizması` — IP bazlı lockout
{% endhint %}

---

## 8. Trunk Geçişi — 2026-08-03

Temizlikten sonra [branching-proposal-2026-08.md](branching-proposal-2026-08.md) uygulandı.

| Adım | Durum |
|------|-------|
| `main`'i `test` seviyesine hizala (PR #892) | ✅ |
| `dev`'i `test` seviyesine hizala (PR #893) | ✅ |
| Üç branch içerik olarak birebir aynı | ✅ Doğrulandı |
| Workflow tetikleyicileri `test`/`dev` → `main` | ✅ |
| `enforce-test-base` job'u kaldırıldı | ✅ |
| Sunucu deploy script'i `git checkout main` | ✅ |
| `branching.md` trunk modeliyle yeniden yazıldı | ✅ |
| Default branch → `main` | ✅ |
| `main-protection`'a required status check eklendi | ✅ |
| Production pipeline (`v*` tag) | ⛔ Yapılmadı — gerekçe aşağıda |

### Production pipeline neden yapılmadı

`docs/archive/branching-proposal-2026-08.md` §5 adım 5'te yer alıyor ama şu an inşa edilemez:

1. `PROD_SSH_HOST` / `PROD_SSH_PRIVATE_KEY` secret'ları tanımlı değil.
2. Production stack sunucuda **hiç kurulmadı** — `.env.prod` yok (`known-issues.md` #2).
3. `docker-compose.prod.yml` eksik: backend healthcheck yok, OAuth/CORS/Resend env yok,
   `SA_PASSWORD` ↔ `MSSQL_SA_PASSWORD` uyumsuz (`known-issues.md` #5).

Bu üçü çözülmeden yazılacak pipeline ilk çalıştırmada patlar. Sıra:
`devops-backlog.md` 1.2–1.4 → 2.1 → 2.2/2.3.

### `dev` ve `test` branch'leri

Silinmediler. Aynı gün üç dallı modele dönüldüğü için tekrar aktif kullanımdalar — bkz. §9.

---

## 9. Üç Dallı Terfi Modeline Dönüş — 2026-08-03 (aynı gün)

Trunk geçişinden birkaç saat sonra model tekrar değiştirildi. **Gerekçe teknik değil, bağlamsal:**

1. Test ortamı fiilen **müşteriye/paydaşa gösterilen yüzey** (`known-issues.md` #2:
   `cargopilot.divizyon.org` yalnızca test ortamını sunuyor). Hafta ortasında değişmemesi isteniyor.
2. Ayrı bir **QA/test adımı var** — geliştiriciler *ve* DevOps/QA aynı sürümü test ediyor.
3. `main` ileride **ayrı bir prod sunucusunda** çalışacak.

Bu üçü birlikte, dondurulabilir bir dalı gerekçelendiriyor. Trunk modeli bunu ancak
feature flag'lerle taklit edebilirdi.

### Eski üç dallı modelden farkı

Eskiden iş branch'i **hem `dev`'e hem `test`'e** ayrı PR açıyordu — iş başına 2 PR (§7 madde 2).
Yeni modelde iş branch'i **yalnızca `dev`'e** PR açar; `dev → test` ve `test → main` ayrı
**terfi PR'larıdır** ve biriken işi toplu taşır.

| Uygulanan | Durum |
|-----------|-------|
| `main → test` ve `main → dev` hizalama (PR #896, #897) | ✅ Üç ağaç birebir aynı |
| `test-deploy.yml` deploy kaynağı `main` → `test` | ✅ |
| Sunucu deploy script'i `git checkout test` | ✅ `Switched to branch 'test'` |
| `ci.yml` PR hedefleri: `dev`, `test`, `main` | ✅ |
| **`Terfi Zinciri Kontrolü`** job'u (`ci.yml`) | ✅ PR #904 ile fiilen doğrulandı |
| `release-tag.yml` — `main`'e terfide `v0.<n>.0` | ✅ `v0.1.0` oluştu |
| Ruleset'ler: dal bazında merge yöntemi + required check | ✅ |
| Bypass modu `always` → `pull_request` (dev/test) | ✅ |
| `branching.md` üç dallı modelle yeniden yazıldı | ✅ |
| Production pipeline | ⛔ Hâlâ yok — §8'deki gerekçeler geçerli |

PR zinciri: #898 (→dev) → #899 (→test) → #900 (→main) → #901/#902/#903 (etiket düzeltmesi).

### Ayrışmayı önleyen kontroller

Bu modelin bilinen kırılma noktası dalların ayrışmasıdır — bu repoda bir kez yaşandı
(`known-issues.md` #6: #482 `dev`'i atladı, `sync/test-to-dev` yaması gerekti). İki kontrol var:

1. **`Terfi Zinciri Kontrolü`** — `test`'e yalnızca `dev`'den, `main`'e yalnızca `test`/`hotfix/*`.
2. **Ruleset merge yöntemi kısıtı** — terfi PR'ında squash yapılamaz. Squash yapılsaydı hedef dal,
   kaynakta bulunmayan yeni bir commit alır ve fark haftalar sonra ortaya çıkardı.

Kalan risk **insan disiplinine bağlı** ve otomatikleştirilmedi:
`hotfix/* → main` sonrası `main → test → dev` geri-merge'ünün unutulması.

---

## 7. Kök Neden

Bu tablonun 26 iş branch'iyle oluşmasının üç nedeni var; hiçbiri kişi kaynaklı değil:

1. **`delete_branch_on_merge` kapalı** → merge edilmiş 7 branch hâlâ listede duruyor.
2. **Her iş için 2 PR** (`dev` + `test`) → PR sayısı ve gürültü ikiye katlanıyor. Son 40 PR ölçüldüğünde:
   **13 branch birden fazla PR açmış**, son 30 PR'ın **10'u merge edilmeden kapatılmış**.
   Uç örnekler: `bugfix/refresh-yeni` → #876/#877 kapatıldı, #878/#879 merge edildi (4 PR, tek iş);
   `feature/US-XXX-planning-3d-ui-revize-coklu-arac` → 5 PR.
   Review kapasitesinin önemli bir kısmı aynı diff'i ikinci kez okumaya gidiyor.
3. **Uzun ömürlü branch'ler** → 1000+ commit geride kalan branch rebase edilemiyor, kimse silmeye de
   cesaret edemiyor, süresiz duruyor.

Üçünün de yapısal karşılığı [branching-proposal-2026-08.md](branching-proposal-2026-08.md)'de.
