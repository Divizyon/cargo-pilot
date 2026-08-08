# Deployment

**Son güncelleme:** 2026-08-08 · **Durum:** Aktif

Bu doküman test ve production ortamlarının servis adreslerini, stack yönetimini, env dosyalarını, database migration sürecini, container operasyonlarını ve CI/CD akışını açıklar.

---

## Ortamlar ve servis adresleri

{% tabs %}
{% tab title="🧪 Test" %}
| Servis | Adres |
|--------|-------|
| Frontend | `http://104.247.163.42:3001` |
| Backend API | `http://104.247.163.42:8081` |
| Backend Health | `http://104.247.163.42:8081/health` |
| MinIO Console | `http://104.247.163.42:9003` |
| MinIO API | `http://104.247.163.42:9002` |
| MSSQL | `104.247.163.42:1434` — DB: `CargoPilotTest` |
| Grafana | `http://104.247.163.42:3002` |
| Prometheus | `http://104.247.163.42:9091` |
{% endtab %}

{% tab title="🚀 Production" %}
| Servis | Adres |
|--------|-------|
| Frontend | `http://104.247.163.42:80` |
| Backend API | `http://104.247.163.42:8080` |
| Backend Health | `http://104.247.163.42:8080/health` |
| MinIO Console | `http://104.247.163.42:9001` |
| MinIO API | `http://104.247.163.42:9000` |
| MSSQL | `104.247.163.42:1433` — DB: `CargoPilot` |
| Grafana | `http://104.247.163.42:3000` |
| Prometheus | `http://104.247.163.42:9090` |
{% endtab %}
{% endtabs %}

---

## Stack yönetimi

{% tabs %}
{% tab title="🧪 Test" %}
```bash
# Başlat
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test up -d

# Durdur
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test down

# Log takibi
docker logs -f cargo-pilot-backend-test
docker logs -f cargo-pilot-frontend-test
```
{% endtab %}

{% tab title="🚀 Production" %}
```bash
# Başlat
docker compose -f infra/compose/docker-compose.prod.yml \
  --env-file infra/env/.env.prod up -d

# Durdur
docker compose -f infra/compose/docker-compose.prod.yml \
  --env-file infra/env/.env.prod down

# Log takibi
docker logs -f cargo-pilot-backend-prod
docker logs -f cargo-pilot-frontend-prod
```
{% endtab %}
{% endtabs %}

---

## Env Dosyaları

| Ortam | Yol |
|-------|-----|
| Test | `/opt/cargo-pilot/infra/env/.env.test` |
| Production | `/opt/cargo-pilot/infra/env/.env.prod` |

Her iki dosya `chmod 600` ile korunur, Git'e eklenmez.

---

## Database Migration

{% hint style="info" %}
Sunucuda .NET SDK kurulu değil. Migration'lar geçici SDK container'ı üzerinden çalıştırılır.
{% endhint %}

{% tabs %}
{% tab title="🧪 Test" %}
```bash
docker run --rm \
  --network cargo-pilot-test-network \
  -v /opt/cargo-pilot:/src \
  -w /src \
  -e ConnectionStrings__DefaultConnection="Server=cargo-pilot-mssql-test,1433;Database=CargoPilotTest;User Id=sa;Password=<SA_PASSWORD>;TrustServerCertificate=True;" \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  sh -c "dotnet tool install --global dotnet-ef && export PATH=\"\$PATH:/root/.dotnet/tools\" && dotnet ef database update --project apps/backend/CargoPilot.Infrastructure --startup-project apps/backend/CargoPilot.Infrastructure"
```
{% endtab %}

{% tab title="🚀 Production" %}
```bash
docker run --rm \
  --network cargo-pilot-prod-network \
  -v /opt/cargo-pilot:/src \
  -w /src \
  -e ConnectionStrings__DefaultConnection="Server=cargo-pilot-mssql-prod,1433;Database=CargoPilot;User Id=sa;Password=<SA_PASSWORD>;TrustServerCertificate=True;" \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  sh -c "dotnet tool install --global dotnet-ef && export PATH=\"\$PATH:/root/.dotnet/tools\" && dotnet ef database update --project apps/backend/CargoPilot.Infrastructure --startup-project apps/backend/CargoPilot.Infrastructure"
```
{% endtab %}
{% endtabs %}

**Migration doğrulama:**

```bash
docker exec cargo-pilot-mssql-test /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "<SA_PASSWORD>" -C -d CargoPilotTest \
  -Q "SELECT name FROM sys.tables"
```

---

## Container Operasyonları

```bash
# Tüm cargo-pilot container'larını gör
docker ps | grep cargo-pilot

# Tek servis yeniden başlat
docker restart cargo-pilot-backend-test
docker restart cargo-pilot-backend-prod
```

---

## CI/CD Akışı

| Branch | Tetikleyici | Sonuç |
|--------|------------|-------|
| `feature/*`, `bugfix/*` | Push | Deploy (Test) — inline build + healthcheck |
| `dev` | PR açılınca | Deploy (Test) — merge öncesi doğrulama |
| `test` | PR + Push | Image Build → GHCR Push → Deploy (Test) |
| `main` | Push | _(Production pipeline henüz yok)_ |

---

## Production Durumu

{% hint style="warning" %}
**Production stack henüz deploy edilmedi.** Test ortamı şu an product demo için kullanılmaktadır. Detaylar için bkz. [Bilinen Sorunlar](known-issues.md).
{% endhint %}

`main` branch'e push sonrası `release-tag.yml` otomatik olarak `v0.<n>.0` formatında bir sürüm etiketi atar; bu etiketleme herhangi bir deploy tetiklemez. `v*` etiketleri şu an hiçbir workflow tarafından tüketilmiyor — production CI/CD pipeline'ı henüz kurulmadı.

---

## İlgili Dokümanlar

- [Sunucu Erişim & Ağ](server-access.md) — SSH erişimi ve sunucu ağ detayları
- [Bilinen Sorunlar](known-issues.md) — açık deployment riskleri
- [Secret Yönetimi](secret-management.md) — env dosyaları ve CI/CD secret'ları
