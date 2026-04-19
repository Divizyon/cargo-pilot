# Cargo Pilot - Deployment Bilgileri

**Son Güncelleme:** 2026-04-19
**CI/CD:** Otomatik deploy aktif ✅
**Sunucu:** 104.247.163.42

---

## Ortamlar

| Ortam | Branch | Güncelleme |
|-------|--------|------------|
| Production | `main` | `main`'e merge → otomatik deploy |
| Test | `test` | `test`'e merge → otomatik deploy |

---

## Servis Adresleri

### Production
| Servis | Adres |
|--------|-------|
| Frontend | `http://104.247.163.42:80` |
| Backend API | `http://104.247.163.42:8080` |
| Backend Health | `http://104.247.163.42:8080/health` |
| MinIO Console | `http://104.247.163.42:9001` |
| MinIO API | `http://104.247.163.42:9000` |
| MSSQL | `104.247.163.42:1433` — DB: `CargoPilot` |

### Test
| Servis | Adres |
|--------|-------|
| Frontend | `http://104.247.163.42:3001` |
| Backend API | `http://104.247.163.42:8081` |
| Backend Health | `http://104.247.163.42:8081/health` |
| MinIO Console | `http://104.247.163.42:9003` |
| MinIO API | `http://104.247.163.42:9002` |
| MSSQL | `104.247.163.42:1434` — DB: `CargoPilotTest` |

---

## Env Dosyaları (Sunucuda)

| Ortam | Yol |
|-------|-----|
| Production | `/opt/cargo-pilot/infra/env/.env.prod` |
| Test | `/opt/cargo-pilot/infra/env/.env.test` |

Her iki dosya da `chmod 600` ile korunuyor, Git'e eklenmez.

---

## Docker Compose

```bash
# Production
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod up -d

# Test
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up -d
```

İki stack `name:` alanı ile izole edilmiştir — biri başlatılınca diğerini etkilemez.

---

## Container Yönetimi

```bash
# Tüm container'ları gör
docker ps | grep cargo-pilot

# Log takibi
docker logs -f cargo-pilot-backend-prod
docker logs -f cargo-pilot-backend-test

# Tek servis yeniden başlat
docker restart cargo-pilot-backend-prod
docker restart cargo-pilot-backend-test

# Stack durdur
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod down
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test down
```

---

## Database Migration

Migration'lar sunucuda dotnet SDK olmadığı için geçici SDK container'ı ile çalıştırılır:

```bash
# Test DB
docker run --rm \
  --network cargo-pilot-test-network \
  -v /opt/cargo-pilot:/src \
  -w /src \
  -e ConnectionStrings__DefaultConnection="Server=cargo-pilot-mssql-test,1433;Database=CargoPilotTest;User Id=sa;Password=<MSSQL_SA_PASSWORD>;TrustServerCertificate=True;" \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  sh -c "dotnet restore && dotnet tool install --global dotnet-ef && export PATH=\"\$PATH:/root/.dotnet/tools\" && dotnet ef database update --project apps/backend/CargoPilot.Infrastructure --startup-project apps/backend/CargoPilot.Infrastructure"

# Production DB (network adını güncelle)
docker run --rm \
  --network cargo-pilot-prod-network \
  -v /opt/cargo-pilot:/src \
  -w /src \
  -e ConnectionStrings__DefaultConnection="Server=cargo-pilot-mssql-prod,1433;Database=CargoPilot;User Id=sa;Password=<MSSQL_SA_PASSWORD>;TrustServerCertificate=True;" \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  sh -c "dotnet restore && dotnet tool install --global dotnet-ef && export PATH=\"\$PATH:/root/.dotnet/tools\" && dotnet ef database update --project apps/backend/CargoPilot.Infrastructure --startup-project apps/backend/CargoPilot.Infrastructure"
```

Migration doğrulama:
```bash
docker exec cargo-pilot-mssql-test /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "<MSSQL_SA_PASSWORD>" -C -d CargoPilotTest \
  -Q "SELECT name FROM sys.tables"
```

---

## SSH Erişimi

```bash
ssh root@104.247.163.42
# Şifre ile giriş kapalı, SSH key gerekli
```

GitHub Actions deploy key: `~/.ssh/authorized_keys`'e ekli.

---

## Güvenlik Notları

- Şifreler yalnızca `.env.prod` ve `.env.test` dosyalarında, sunucuda `/opt/cargo-pilot/infra/env/` altında
- Bu dosyalar Git'e eklenmez (`.gitignore` ile korumalı)
- Production ve test ayrı network, ayrı volume, ayrı DB ile tamamen izole
