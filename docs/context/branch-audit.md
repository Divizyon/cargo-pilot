# Branch & PR Denetimi

**Tarih:** 2026-08-03 · **Referans:** `origin/test` @ `3c42f65a`
**Durum:** 🔍 Analiz — **hiçbir branch silinmedi, hiçbir PR kapatılmadı.** Bu doküman karar önerisidir.

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

| PR | Branch | Hedef | Durum | Öneri |
|----|--------|-------|-------|-------|
| #835 | `feature/US-XXX-coklu-arac` | `test` | CONFLICTING · 49 dosya · +4184/−671 | **Kapat** |
| #834 | `feature/US-XXX-coklu-arac` | `dev` | CONFLICTING · aynı diff | **Kapat** |

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
| `test` | — | Default branch. Korumalı (1 review + 3 required check). Aktif, güncel. |
| `dev` | 3 geride / 9 önde (hepsi merge commit) | **İçerik `test` ile birebir aynı.** Korumasız. |
| `main` | 2051 geride / 0 önde | 2026-04-11'den beri dokunulmamış. **Korumasız.** Production hiç deploy edilmedi. |

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

`main`, `test`'in tam atası — yani `git push origin test:main` **fast-forward** olarak çalışır,
çakışma riski yok. Şu an korumasız ve boş bir kabuk. Karar: ya trunk yapılacak (§6 önerisi)
ya da en azından branch protection eklenecek.

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
> `apps/backend/docs/matematiksel_model.md` (425 satır),
> `apps/backend/docs/sistem_mimarisi.md` (330),
> `apps/backend/docs/bin_packing_implementation_plan.md` (405).
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
| 1 | `feature/3D_Packing_Algorithm`'daki 3 algoritma dokümanını `test`'e al | Yok — sadece doküman | ✅ PR açıldı |
| 2 | §5'teki 4 branch için sahipleriyle 15 dk'lık karar toplantısı | Yok | ⏳ Ekipte |
| 3 | Açık PR #834/#835'i gerekçeli kapat | Düşük | ⏳ |
| 4 | §4.1'deki 7 branch'i sil | Yok | ⏳ |
| 5 | §4.2'deki 11 branch'i sil (1. adımdan sonra) | Düşük | ⏳ |
| 6 | §4.3'teki 4 story'yi backlog'a yaz, sonra branch'leri sil | Düşük | ⏳ |
| 7 | `delete_branch_on_merge` ayarını **açık** hale getir | Yok — birikmeyi kökten keser | ⏳ |
| 8 | Branch stratejisi kararı → [branching-proposal.md](branching-proposal.md) | — | ⏳ |

> `dev`'de kurtarılacak iş bulunmadığı için (§3.1) ayrı bir taşıma adımı gerekmiyor.

> Silmeden önce güvenlik ağı: `git tag archive/<branch-adı> origin/<branch-adı> && git push origin --tags`.
> Tag'ler commit'leri kalıcı tutar, branch listesini kirletmez, gerektiğinde geri alınır.

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

Üçünün de yapısal karşılığı [branching-proposal.md](branching-proposal.md)'de.
