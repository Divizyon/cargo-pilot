# ADR-0009 — Otomatik geri alma sessizce başarılı dönmez

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-17 (PR #1017, Dalga 2b — D-24, D-26, D-27, D-28)
- **Kapsam:** `.github/workflows/test-deploy.yml` (`deploy-test-server` job'u),
  `docs/devops/rollback-runbook.md`, `infra/scripts/rollback.sh`
- **Not:** Bu ADR geriye dönük yazılmıştır; karar PR #1017 ile uygulandı ve aynı gün yapılan
  `dev → test` terfisinde canlı doğrulandı.

## Bağlam

`test` dalına her push'ta `deploy-test-server` job'u sunucuya bağlanıp GHCR'dan yeni image'ı
çekiyor ve stack'i güncelliyor. Deploy sonrası loopback health kontrolü var
(`test-deploy.yml:500-506`).

PR #1017 öncesinde health düştüğünde job kırmızıya dönüyordu **ama sunucu bozuk image ile
çalışmaya devam ediyordu**. Yani test ortamı, birileri elle müdahale edene kadar bozuk kalıyordu.

Aynı PR'da iki ön koşul da düzeltildi:

- `docker compose down --remove-orphans` adımı kaldırıldı; artık tek `up -d --no-build
  --remove-orphans` çağrısı var (`test-deploy.yml:494-498`). Eski hâl `mssql` ve `minio` dahil
  tüm stack'i kapatıyor ve her deploy'da 2–3 dakikalık kesinti üretiyordu — oysa deploy edilen
  yalnız `backend` ve `frontend`. (D-26)
- `docker image prune -f` health kontrolünün **sonrasına** alındı (`test-deploy.yml:534-538`).
  Önceden prune health'ten önce çalışıyor, geri dönülecek image o an diskte olmayabiliyordu.
  Bu, otomatik geri almanın ön koşuludur. (D-28)

## Karar

### 1. Health düşerse bir önceki image'a otomatik geri dönülür

Pull'dan **önce**, çalışan backend konteynerinin image referansından mevcut tag türetilip çıpa
olarak saklanır (`test-deploy.yml:458-459`):

```bash
PREV_IMAGE_REF="$(docker inspect --format '{{.Config.Image}}' cargo-pilot-backend-test 2>/dev/null || true)"
PREV_IMAGE_TAG="${PREV_IMAGE_REF##*:}"
```

Health düşerse bu tag ile **tek seferlik** `up -d --no-build --remove-orphans` çalıştırılır
(`test-deploy.yml:511-522`).

Gerekçe:

- Çıpa, sunucuda **zaten var olan gerçeği** okur: ek durum dosyası, `latest-good` tag'i veya
  GHCR sorgusu gerektirmez.
- Konteyner yoksa (ilk deploy) çıpa boş kalır — doğal bir "ilk deploy" koruması.
- Yalnız `backend` konteyneri sorgulanır: backend ve frontend her zaman aynı `IMAGE_TAG` ile
  (aynı `needs.build.outputs.image_tag`) deploy edilir; ikisini ayrı izlemek ayrışamayacak bir
  durumu modellemek olurdu.

Sonuçları:

- Geri alma denenmeyen iki durum var (`test-deploy.yml:512`): çıpa boş, ya da
  `PREV_IMAGE_TAG == IMAGE_TAG` (aynı tag yeniden deploy — geri dönülecek yer yok). İki hâlde de
  stack olduğu gibi bırakılır, açık mesaj basılır.
- Geri alınacak image'ın diskte olması D-28'in yeni prune sırasına bağlıdır; sunucuda başka bir
  prune cron'u varsa bu varsayım kırılabilir.

### 2. Geri alma başarılı olsa bile job **`exit 1`** verir

Geri alma sonucundan bağımsız olarak job kırmızı bırakılır (`test-deploy.yml:529-530`).

Gerekçe:

- **Geri alma bir onarım değil, hasar sınırlamasıdır.** Ortam kurtarılır; bozuk commit hâlâ
  bozuktur.
- "Sessizce yeşil" dönmek, D-27'nin çözdüğü sorundan daha tehlikeli bir durum üretirdi: bozuk
  commit `test`'e gömülür, pipeline yeşil görünür ve kimse bakmaz. Bir sonraki terfide
  `main`'e taşınır.
- `test` dalına giren içerik yalnız terfi ile değişir (ADR-0006); bozuk bir commit'in kırmızı
  bir sinyal bırakmadan orada durması, terfi zincirinin tek doğrulama noktasını iptal eder.

Sonuçları:

- Deploy job'unun yeşil olması "sunucu ayakta" değil, "bu commit sağlıklı" anlamına gelir —
  ikisi karıştırılmaz.
- Geri alma sonrası çalışan health döngüsü (`test-deploy.yml:519-525`) yalnızca **raporlar**,
  çıkış kodunu değiştirmez.

### 3. Geri almanın kendisi için ikinci bir geri alma denenmez

Gerekçe:

- Özyinelemeli ya da çok adımlı bir geri alma zinciri, sonsuz döngü ve çift geri alma üretebilir.
- Geri alma tek adımdır ve tek `up` çağrısıdır; başarısız olursa mesaj basılır
  (`|| echo "Geri alma komutu hata verdi."`) ve akış devam eder.

Sonuçları:

- Döngü riski yapısal olarak kapalıdır; hiçbir senaryoda ikinci `up` çağrısı üretilmez.
- Geri alma da başarısızsa insan müdahalesi gerekir; prosedür `docs/devops/rollback-runbook.md`
  içindedir.

### 4. Çıpa, **kullanılmadan önce doğrulanır**

`${PREV_IMAGE_REF##*:}` ayrıştırması her zaman geçerli bir tag üretmez: `.Config.Image` digest
biçiminde (`ghcr.io/…@sha256:abc…`) ya da tag'siz dönebilir. Bu yüzden çıpa iki `case` bloğuyla
elenir (`test-deploy.yml:467-475`):

| Gelen `.Config.Image` biçimi | Sonuç |
|---|---|
| `ref:tag` (beklenen) | Çıpa kabul edilir |
| `ref@sha256:…` (digest referansı) | Çıpa boşaltılır |
| `:` içermeyen ref (tag belirtilmemiş) | Çıpa boşaltılır |
| Boş (konteyner yok / ilk deploy) | Çıpa boşaltılır |
| `/` içeren değer (yol parçası) | Çıpa boşaltılır |
| Boşluk içeren değer | Çıpa boşaltılır |

Gerekçe:

- Çıpa şüpheliyse geri alma **hiç denenmez**. Aksi hâlde `up`, var olmayan bir image arar ve
  ortam bugünkünden **daha kötü** duruma düşer: mevcut (bozuk ama çalışan) konteynerler de gider.
- Doğrulama başarısız olduğunda davranış mevcut hâle eşitlenir: stack olduğu gibi kalır,
  job yine `exit 1` verir.

Sonuçları:

- Altı biçim senaryosunun tamamında en kötü sonuç "geri alma atlandı" olur, "ortam bozuldu"
  olmaz.
- Çıpanın gerçek biçimi log'a basılır (`==> Geri alma çıpası: …`), böylece bir dahaki deploy'da
  varsayım gözle doğrulanabilir.

## Doğrulama

**Kabuk davranışı** — script YAML'dan çıkarılıp `set -e` altında `curl`/`docker` stub'larıyla
koşturuldu:

| Senaryo | Çıktı | Çıkış kodu |
|---|---|---|
| Health fail + önceki image var | `==> Otomatik geri alma: test-old` + tek `up` çağrısı | **1** |
| Health fail + ilk deploy (çıpa boş) | `Geri donulecek onceki image yok; stack oldugu gibi birakildi.` | **1** |
| Health fail + aynı tag | Aynı mesaj, geri alma yok | **1** |
| Health OK | `Backend loopback health OK.` + prune | 0 |

Hiçbir senaryoda ikinci `up` çağrısı ya da döngü gözlenmedi.

**Canlı doğrulama** — 2026-08-17 `dev → test` terfisi (PR #1017 sonrası ilk gerçek deploy):

| Gözlem | Sonuç |
|---|---|
| Çıpa çıktısı | `test-faf7cb0` — beklenen `ref:tag` biçimi, doğrulamadan geçti |
| Yeniden yaratılan servisler | Yalnız `backend` + `frontend` |
| Ayakta kalan servisler | `mssql`, `minio` (ağ ve volume'lara dokunulmadı) |
| Konteyner takası | **2,8 sn** (önceki `down` + `up` modelinde 2–3 dk) |

Yani D-26'nın kesinti kısaltması ve D-27'nin çıpa varsayımı aynı koşumda birlikte doğrulandı.

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| Geri alma başarılıysa job'u **yeşil** bırakmak | Bozuk commit `test`'e sessizce gömülür ve bir sonraki terfide `main`'e taşınır; geri alma bir onarım değil, hasar sınırlamasıdır |
| Hiç geri alma yapmamak (eski hâl) | Job kırmızı olur ama sunucu bozuk image ile çalışmaya devam eder; test ortamı elle müdahaleye kadar bozuk kalır |
| Deploy edilen tag'i sunucuda bir **durum dosyasına** yazmak | Dosya bayatlar ve elle müdahaleyle uyumsuz düşer; çalışan konteynerin `.Config.Image`'ı her zaman gerçeği söyler |
| Backend ve frontend için **iki ayrı çıpa** | İkisi her zaman aynı `needs.build.outputs.image_tag` ile deploy ediliyor; ayrışamayacak bir durumu modellemek olurdu |
| Özyinelemeli / çok adımlı geri alma zinciri | Sonsuz döngü ve çift geri alma riski; tek adımlı geri alma bu riski yapısal olarak kapatır |
| Çıpayı doğrulamadan kullanmak | `.Config.Image` digest ya da tag'siz dönerse `##*:` geçersiz bir tag üretir; `up` var olmayan image arar ve ortam bugünkünden daha kötü duruma düşer |
| `down` + `up` sırasını korumak (eski hâl) | `mssql` ve `minio` dahil tüm stack kapanıyor, her deploy 2–3 dk kesinti üretiyordu; ölçülen yeni takas 2,8 sn |
| Prune'u health'ten önce çalıştırmak (eski hâl) | Geri dönülecek image o an diskte olmayabilir; geri alma GHCR'dan yeniden pull gerektirir |

## Açık konular

- **Kod rollback'i DB şemasını geri almaz:** `DbInitializer.MigrateAsync()` yalnız ileri
  yönlüdür ve `infra/scripts/rollback.sh` migration'a hiç dokunmaz. Migration'ın geri alınması
  gerekiyorsa yedekten dönüş prosedürü uygulanır (`docs/devops/rollback-runbook.md`).
- Geri almanın **kendisi** ancak bilerek bozuk bir image deploy edilerek görülebilir
  (runbook §6 senaryo 2). Bu bir tatbikat işidir, CI işi değil; henüz yapılmadı.
- `infra/scripts/rollback.sh` bugüne kadar hiç çalıştırılmadı (D-29); PR #1017'deki yeni
  sıralama (yedek → checkout → pull → down → up → health) yalnız `bash -n` seviyesinde
  doğrulandı.
- Geri alınacak image'ın diskte bulunması D-28'in prune sırasına bağlıdır; sunucuda başka bir
  disk temizliği varsa `docker images | grep cargo-pilot` ile teyit edilmelidir.
