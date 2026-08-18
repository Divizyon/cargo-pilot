# Rollback Runbook

**Son güncelleme:** 2026-08-16 · **Durum:** Aktif

Bu doküman bir deploy'un geri alınması gerektiğinde izlenecek adımları tanımlar.
Kod geri alma ile veritabanı geri alma **aynı şey değildir**; en kritik nokta budur.

> ⚠️ **Temel kısıt:** `DbInitializer.MigrateAsync()` yalnız ileri yönlüdür. `rollback.sh`
> yalnız **kodu ve image'ı** eski sürüme döndürür, **DB şemasını geri almaz.**
> Şema geri alınacaksa tek yol yedekten dönüştür (§4).

---

## 1. Ne zaman rollback edilir

| Durum | Aksiyon |
|---|---|
| Deploy sonrası backend health düşük, sunucu bozuk image ile çalışıyor | Otomatik geri alma devreye girer (§2). Girmemişse §3. |
| Deploy başarılı ama uygulama işlevsel olarak bozuk (5xx, kritik akış çalışmıyor) | Manuel rollback (§3) |
| Migration uygulandı ve veri bozuyor | **Önce §4** (yedekten dönüş), sonra §3 |
| Yalnız bir konfigürasyon/env hatası | Rollback etme; env'i düzeltip `up -d` yeterli |
| Frontend'de görsel/kozmetik hata | Rollback etme; ileri yönlü düzeltme (fix-forward) tercih edilir |

**Karar kuralı:** Sorun **veri bütünlüğüne** dokunuyorsa rollback; yalnız davranışa
dokunuyorsa fix-forward genelde daha ucuzdur. Rollback her zaman migration riski taşır.

---

## 2. Otomatik geri alma (test ortamı, deploy sırasında)

`.github/workflows/test-deploy.yml` → `deploy-test-server` job'u:

1. Pull'dan **önce** çalışan `cargo-pilot-backend-test` konteynerinin image referansından
   mevcut tag saklanır (geri alma çıpası).
2. Yeni image çekilir, `up -d --no-build --remove-orphans` ile stack güncellenir.
3. Sunucu içinden `http://127.0.0.1:8081/health` loopback probu ile en fazla 100 sn beklenir.
4. Health düşerse çıpa tag'i ile **tek seferlik** `up -d` çalıştırılıp önceki image'a dönülür.
5. Geri alma başarılı olsa bile **job kırmızı bırakılır.**

**Sınırları — bunları bilerek kullanın:**
- Yalnız **image**'ı geri alır. `git checkout test` adımı geri alınmaz; sunucudaki çalışma
  ağacı yeni commit'te kalır. Bu, compose dosyası veya `.env.test` değiştiyse önemlidir.
- **DB migration'ını geri almaz.** Yeni sürüm migration uyguladıysa eski image yeni şemaya
  karşı çalışır. Uyumsuzsa geri alma da health veremez → §4.
- İlk deploy'da (önceki konteyner yok) veya tag aynıysa geri alma denenmez.
- Prod'da bu mekanizma **yoktur**; prod deploy pipeline'ı henüz yok.

---

## 3. Manuel rollback

### 3a. Workflow üzerinden (tercih edilen)

GitHub Actions → **Rollback** workflow → `Run workflow`:
- `environment`: `test` | `prod`
- `target_ref`: hedef tag/SHA (boş bırakılırsa bir önceki `v*` tag'ine dönülür)

### 3b. Sunucudan doğrudan

```bash
ssh root@<sunucu>
cd /opt/cargo-pilot
./infra/scripts/rollback.sh test v1.2.3      # veya: ./infra/scripts/rollback.sh prod
```

`rollback.sh` sırası:
1. Rollback öncesi DB yedeği (`backup-db.sh`)
2. `git fetch --tags` + hedef ref'e `checkout`
3. **Image'ları GHCR'dan çek** (test ortamı)
4. `down --remove-orphans`
5. `up -d` (test: `--no-build`, prod: `--build`)
6. Health kontrolü — düşerse çıkış kodu 1

Adım 3'ün adım 4'ten **önce** olması bilinçlidir: image çekilemezse (GHCR erişimi yok,
tag yok) ortam hiç kapatılmamış olur ve elde kalır.

### 3c. Rollback sonrası doğrulama

```bash
docker compose -f infra/compose/docker-compose.test.yml ps
curl -sf http://127.0.0.1:8081/health
docker compose -f infra/compose/docker-compose.test.yml logs --tail=100 backend
```

Beklenen: tüm servisler `Up`, health 200, backend loglarında migration hatası yok.

---

## 4. Migration geri alınamıyorsa

Bu bölüm **her rollback'te değil**, yalnız yeni sürüm DB şemasını değiştirmişse geçerlidir.

**Önce tespit et:** Rollback edilecek aralıkta migration var mı?

```bash
cd /opt/cargo-pilot
git diff --name-only <hedef-ref>..HEAD -- apps/backend/CargoPilot.Infrastructure/Persistence/Migrations/
```

Çıktı boşsa şema değişmemiştir → §3 tek başına yeterli, bu bölümü atla.

**Çıktı boş değilse — şema değişmiştir. Seçenekler:**

| Migration türü | Geri alınabilir mi | Yapılacak |
|---|---|---|
| Yalnız ekleme (yeni tablo/kolon, nullable) | Genelde gerek yok | Eski sürüm fazla kolonu görmez; §3 yeterli. Doğrula. |
| Kolon/tablo silme veya yeniden adlandırma | **Hayır** | Yedekten dönüş (§4a) zorunlu |
| Veri dönüştüren migration (backfill, tip değişimi) | **Hayır** | Yedekten dönüş (§4a) zorunlu |

### 4a. Yedekten dönüş adımları

1. **Uygulamayı durdur** — geri yükleme sırasında yazma olmamalı:
   ```bash
   docker compose -f infra/compose/docker-compose.test.yml stop backend
   ```
2. **Kullanılacak yedeği seç ve doğrula:**
   ```bash
   ls -lt /opt/cargo-pilot/backups/mssql/test/
   ./infra/scripts/verify-backup.sh test
   ```
   Deploy'dan **önce** alınmış bir yedek seçin. `rollback.sh` kendi başlangıcında da bir
   yedek alır — o yedek **bozuk şemayı içerir**, geri dönüş için onu kullanmayın.
3. **Geri yükle:**
   ```bash
   ./infra/scripts/restore-db.sh test /opt/cargo-pilot/backups/mssql/test/<dosya>.bak
   ```
4. **Kodu eski sürüme al** (§3) — şema ile image sürümü uyumlu olmalı.
5. **Backend'i başlat ve doğrula:**
   ```bash
   docker compose -f infra/compose/docker-compose.test.yml up -d backend
   curl -sf http://127.0.0.1:8081/health
   ```
6. **Veri kaybını hesapla ve kaydet:** son yedek ile olay anı arasındaki yazmalar kayıptır.
   Bu aralığı olay kaydına yazın.

### 4b. Yedek yoksa

Yedek yoksa şema geri alınamaz. Bu durumda tek seçenek **ileri yönlü düzeltme**:
sorunu gideren yeni bir migration yazıp normal deploy akışıyla göndermek.
Rollback denemeyin — eski image yeni şemayla çalışmaz ve ortamı daha da bozarsınız.

---

## 5. `skip_backup` / `--skip-backup` ne zaman kullanılır

`rollback.sh` normalde rollback'ten önce DB yedeği alır ve yedek alınamazsa durur.
Kaçış yolu `--skip-backup` bayrağı (ya da `SKIP_BACKUP=1`), workflow tarafında
`skip_backup` input'udur.

> **Not:** Bu kaçış yolu script sertleştirme çalışmasıyla (backlog D-25) birlikte geliyor.
> Elinizdeki `rollback.sh` sürümünde `--skip-backup` yoksa yedek adımı yalnız uyarı verip
> devam ediyordur; aşağıdaki "kullanma" maddeleri o durumda **daha da** bağlayıcıdır.

**Kullan:**
- Yedek alma adımı takılıyor ve **kesinti maliyeti veri riskinden yüksek** (disk dolu,
  MSSQL yanıt vermiyor, ortam zaten yazma alamıyor).
- Rollback edilen ortam **test** ve içindeki veri feda edilebilir.
- Zaten elde deploy öncesinden **taze ve doğrulanmış** bir yedek var.

**Kullanma:**
- Prod'da, elde deploy öncesi doğrulanmış bir yedek yokken. Bu durumda yedek hatasını
  çözmek rollback'i geciktirmekten daha ucuzdur.
- Migration içeren bir rollback'te (§4) — geri dönüş noktanız kalmaz.

Kullanıldığında karar log'a yazılır. Olay sonrası incelemede "yedek var mıydı" sorusu
bu satırdan cevaplanır; kararı olay kaydına da düşün.

---

## 6. Tatbikat prosedürü

Rollback bugüne kadar **hiç gerçek koşulda denenmedi** (backlog D-29). İlk kez gerçek bir
olayda denenmesi kabul edilebilir bir risk değil. Tatbikat çeyrekte bir, **test ortamında**,
planlı bir pencerede yapılır.

**Ön koşullar:** test ortamında en az iki farklı sürüm tag'i, taze ve `verify-backup.sh` ile
doğrulanmış bir yedek, tatbikat penceresinde test ortamını kullanan kimse olmaması.

**Senaryolar:**

| # | Senaryo | Beklenen sonuç |
|---|---|---|
| 1 | Migration'sız sürüm arasında `rollback.sh test <onceki-tag>` | Health OK, veri değişmez |
| 2 | Bilerek bozuk bir image ile deploy | Otomatik geri alma devreye girer, job kırmızı, ortam eski image'da sağlıklı |
| 3 | GHCR erişimi engelli (`docker logout` + geçersiz tag) | Pull hatası, **stack ayakta kalır** (§3, adım 3-4 sırası) |
| 4 | Migration'lı sürümden yedekten dönüş (§4a) | Şema eski hâline döner, backend eski image ile kalkar |

**Her tatbikat için kaydedilecekler:** başlangıç/bitiş zamanı, ölçülen kesinti süresi,
takılan adım, doküman ile gerçek davranış arasındaki fark, sonuç (başarılı/başarısız).
Doküman ile gerçek arasında fark çıkarsa bu runbook aynı gün güncellenir.

---

## İlgili dokümanlar

- [`deployment.md`](deployment.md) — deploy akışı ve ortam adresleri
- [`devops-backlog.md`](devops-backlog.md) — D-24, D-26, D-27, D-28, D-29
- [`server-access.md`](server-access.md) — sunucu erişimi, yedek cron'ları
- [`known-issues.md`](known-issues.md) — bilinen açık sorunlar
