# Sunucu Erişim & Ağ Yapılandırması

**Son güncelleme:** 2026-08-13 · **Durum:** Aktif

Bu doküman sunucuya SSH erişimini, güvenlik duvarı/fail2ban yapılandırmasını, nginx reverse proxy kurallarını ve monitoring stack başlatma adımlarını açıklar.

---

## Sunucu Bilgileri

| Özellik | Değer |
|---------|-------|
| IP | `104.247.163.42` |
| FQDN | `cargopilot.divizyon.org` |
| OS | Ubuntu 24.04.4 LTS |
| SSH Port | 22 |

---

## SSH Erişimi

```bash
# Key ile bağlan
ssh -i ~/.ssh/cargo-pilot-server root@104.247.163.42

# SSH config alias tanımlıysa
ssh cargopilot
```

**SSH config örneği** (`~/.ssh/config`):

```
Host cargopilot
  HostName 104.247.163.42
  User root
  IdentityFile ~/.ssh/cargo-pilot-server
```

### Güvenlik Ayarları

| Ayar | Değer |
|------|-------|
| `PermitRootLogin` | `prohibit-password` — root şifre girişi kapalı |
| `PubkeyAuthentication` | `yes` |
| `MaxAuthTries` | `3` |

### Yetkili SSH Key'ler

| Key | Kullanım |
|-----|---------|
| `github-actions-prod-deploy` | GitHub Actions CI/CD otomatik deploy |
| `dogancanyildiz-cargo-pilot` | Doğancan Yıldız — geliştirici |
| `hturk-cargo-pilot` | Hasan Türk — geliştirici |
| `eyupece-cargo-pilot` | Eyüp Ece — geliştirici |

### Yeni Geliştirici Ekleme

```bash
# Sunucuda çalıştır:
echo "ssh-ed25519 AAAA... isim-cargo-pilot" >> ~/.ssh/authorized_keys
```

---

## Güvenlik Duvarı (UFW)

**Durum:** Aktif — `deny incoming` varsayılan

| Port | Protokol | Servis |
|------|----------|--------|
| 22 | TCP | SSH (fail2ban korumalı) |
| 80 | TCP | Frontend Prod |
| 8080 | TCP | Backend API Prod |
| 3001 | TCP | Frontend Test |
| 8081 | TCP | Backend API Test |
| ~~9000~~ | TCP | MinIO Prod API — 🔒 artık yalnızca `127.0.0.1` |
| ~~9001~~ | TCP | MinIO Prod Console — 🔒 artık yalnızca `127.0.0.1` |
| ~~9002~~ | TCP | MinIO Test API — 🔒 artık yalnızca `127.0.0.1` |
| ~~9003~~ | TCP | MinIO Test Console — 🔒 artık yalnızca `127.0.0.1` |
| ~~1433~~ | TCP | MSSQL Prod — 🔒 artık yalnızca `127.0.0.1` |
| 1434 | TCP | MSSQL Test (hâlâ dışarıya publish ediliyor) |
| 3000 | TCP | Grafana Prod |
| 3002 | TCP | Grafana Test |
| 9090 | TCP | Prometheus Prod |
| 9091 | TCP | Prometheus Test |

{% hint style="warning" %}
**🔒 Loopback bind — UFW kuralı artık tek başına yeterli değil.** Yukarıda üstü çizili
portlar için Docker publish adresi `127.0.0.1`'e çekildi
(`infra/compose/docker-compose.{test,prod}.yml`). UFW kuralı hâlâ tanımlı olabilir ancak
container portu dış arayüze bağlı olmadığı için uzaktan erişilemez. Bu kuralların UFW'den
temizlenmesi ayrı bir devops işi olarak açıktır.

Erişim SSH tüneli ile yapılır:

```bash
ssh -N -L 9003:127.0.0.1:9003 root@104.247.163.42   # MinIO Test Console
ssh -N -L 9001:127.0.0.1:9001 root@104.247.163.42   # MinIO Prod Console
ssh -N -L 1433:127.0.0.1:1433 root@104.247.163.42   # MSSQL Prod
```

**MSSQL Test portu (1434)** geliştirici erişimi için hâlâ dışarıya publish edilmektedir
(`docker-compose.test.yml`: `"${MSSQL_PORT}:1433"`); bu porta erişimin IP kısıtlaması ile
sınırlandırılması önerilir.
{% endhint %}

---

## fail2ban (Brute Force Koruması)

**Durum:** Aktif

| Parametre | Değer |
|-----------|-------|
| `maxretry` | 5 deneme |
| `findtime` | 10 dakika |
| `bantime` | 1 saat |
| Korunan servis | SSH (port 22) |

```bash
# Ban durumunu gör
fail2ban-client status sshd

# IP'yi unban et
fail2ban-client set sshd unbanip <IP>
```

---

## Nginx Reverse Proxy

Config: `/etc/nginx/sites-available/cargopilot`

| Path | Yönlendirme | Açıklama |
|------|-------------|----------|
| `/api/` | `localhost:8081` | Backend API |
| `/health` | `localhost:8081` | Backend health check |
| `/media/` | `localhost:9002/cargo-pilot-test/` | MinIO dosyaları — public erişim |
| `/` | `localhost:3001` | Frontend (catch-all) |

{% hint style="info" %}
`/media/` path'i MinIO S3 API (port 9002) üzerine reverse proxy yapılmıştır. Bucket policy public olduğundan authentication gerekmez. Dosyalar `https://cargopilot.divizyon.org/media/<path>` formatında erişilebilir.

MinIO Console (port 9003) domain üzerinden yayınlanmaz **ve artık doğrudan
`http://104.247.163.42:9003` adresinden de erişilemez** — port `127.0.0.1`'e bağlıdır.
SSH tüneli kurun:

```bash
ssh -N -L 9003:127.0.0.1:9003 root@104.247.163.42
# tarayıcı: http://localhost:9003
```

nginx `/media/` proxy'si sunucunun kendi üzerinden `localhost:9002`'ye bağlandığı için
bu değişiklikten etkilenmez.
{% endhint %}

---

## Ağ Yapısı

```
İnternet
    │
    ▼
104.247.163.42 (eth0)
    │
    ├── UFW (deny incoming by default)
    │       └── İzin verilen portlar → Servislere yönlendirme
    │
    ├── Nginx → cargopilot.divizyon.org (443/80)
    │       ├── /api/    → backend:8081
    │       ├── /media/  → minio:9002/cargo-pilot-test/
    │       └── /        → frontend:3001
    │
    ├── Docker bridge ağları
    │       ├── cargo-pilot-prod-network   (prod stack)
    │       └── cargo-pilot-test-network   (test stack)
    │
    └── fail2ban → SSH brute force koruması
```

{% hint style="info" %}
Docker, UFW'yi bypass eder — Docker tarafından expose edilen portlar UFW kuralından bağımsız olarak dışarıya açılır. Port kısıtlaması gerekiyorsa Docker `--iptables=false` ayarı veya explicit binding (`127.0.0.1:PORT:PORT`) kullanılmalıdır.
{% endhint %}

---

## Monitoring Stack Başlatma

Monitoring stack CI/CD'den bağımsız olarak bir kez başlatılır ve çalışır halde kalır.

{% tabs %}
{% tab title="🧪 Test" %}
```bash
docker compose \
  -f /opt/cargo-pilot/infra/compose/docker-compose.monitoring.test.yml \
  --env-file /opt/cargo-pilot/infra/env/.env.monitoring.test \
  up -d
```
{% endtab %}

{% tab title="🚀 Production" %}
```bash
docker compose \
  -f /opt/cargo-pilot/infra/compose/docker-compose.monitoring.prod.yml \
  --env-file /opt/cargo-pilot/infra/env/.env.monitoring.prod \
  up -d
```
{% endtab %}
{% endtabs %}

{% hint style="info" %}
`.env.monitoring.prod` ve `.env.monitoring.test` dosyaları sunucuda manuel oluşturulmalıdır. `.example` dosyaları referans alınır.
{% endhint %}

| Servis | Test URL | Prod URL |
|--------|----------|----------|
| Grafana | `http://104.247.163.42:3002` | `http://104.247.163.42:3000` |
| Prometheus | `http://104.247.163.42:9091` | `http://104.247.163.42:9090` |

---

## ERP Veritabanı (DIVIZYON)

**Restore tarihi:** 2026-05-16

Müşteri ERP veritabanı (`DIVIZYON.bak`, SQL Server 2019) `cargo-pilot-mssql-test` container'ına restore edildi.

| Özellik | Değer |
|---------|-------|
| Database adı | `DIVIZYON` |
| Bağlantı (container içinden) | `Server=mssql,1433;Database=DIVIZYON;User Id=sa;...` |
| Tablolar | `TBLSTSABIT` (134 kol), `TBLSIPAMAS` (106 kol), `TBLSIPATRA` (97 kol) |

{% hint style="warning" %}
Bu veritabanı yalnızca **test ve geliştirme** içindir. Production deploy edildiğinde müşterinin canlı ERP sunucusuna bağlanılacaktır.
{% endhint %}

---

## DB Yedekleme

Yedekler cron ile otomatik alınır:

```
00 02 * * *  /opt/cargo-pilot/infra/scripts/backup-db.sh prod
00 03 * * *  /opt/cargo-pilot/infra/scripts/backup-db.sh test
```

| Özellik | Değer |
|---------|-------|
| Yedek dizini | `/opt/cargo-pilot/backups/mssql/{prod\|test}/` |
| Retention | 7 gün |
| Manuel çalıştırma | `bash /opt/cargo-pilot/infra/scripts/backup-db.sh test` |

---

## GitHub Actions Deploy Key

CI/CD pipeline sunucuya `github-actions-prod-deploy` key'i ile bağlanır.

GitHub repository → Settings → Secrets:

| Secret | Değer |
|--------|-------|
| `TEST_SSH_HOST` | `104.247.163.42` |
| `TEST_SSH_PRIVATE_KEY` | github-actions key'inin private kısmı |

Bu adlar `test-deploy.yml` ve `rollback.yml` içinde birebir bu şekilde kullanılır. Secret'ların
tam listesi için bkz. [Secret Yönetimi](secret-management.md).

{% hint style="info" %}
**2026-08-13 denetimi:** Repoda `test` ve `prod` GitHub Environment'ları oluşturuldu; `prod`
required-reviewer koruması altındadır. SSH secret'larının repo seviyesinden environment
seviyesine taşınması önerilir — böylece `prod` erişimi onay kapısının arkasına alınır. **Bu
taşıma henüz yapılmadı;** secret değerleri okunamadığı için environment'a yeniden girilmesi
gerekiyor.
{% endhint %}
