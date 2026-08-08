# Infra Ortam Değişkenleri

**Son güncelleme:** 2026-08-03 · **Durum:** Aktif

Docker Compose ve altyapı servisleri için ortam değişkenlerini ve kurulum adımlarını açıklar.

## Dosya Yapısı

```
infra/env/
├── .env.test.example         # Test ortamı şablonu (repoda takip edilir)
├── .env.prod.example         # Production ortamı şablonu (repoda takip edilir)
├── .env.monitoring.test.example  # Grafana/monitoring şablonu - test
├── .env.monitoring.prod.example  # Grafana/monitoring şablonu - prod
└── README.md                 # Bu dosya

# Aşağıdaki dosyalar .gitignore tarafından dışlanır — repoya EKLENMEZi:
# .env.test
# .env.prod
# .env.monitoring.test
# .env.monitoring.prod
```

## Kurulum

### 1. Örnek Dosyayı Kopyala

```bash
# Test için
cp infra/env/.env.test.example infra/env/.env.test

# Production için
cp infra/env/.env.prod.example infra/env/.env.prod

# Monitoring için (opsiyonel)
cp infra/env/.env.monitoring.test.example infra/env/.env.monitoring.test
```

### 2. Değerleri Düzenle

- **Test:** `<CHANGE_ME_*>` ile işaretli tüm placeholder'ları gerçek değerlerle değiştir
- **Production:** `<GENERATE_*>` ile işaretli tüm değerleri güçlü, unique değerlerle doldur

### 3. Docker Compose ile Kullan

```bash
# Test
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up -d

# Production
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod up -d
```

## Değişken Referansı

### Genel

| Değişken | Açıklama | Secret? | Test | Production |
|----------|----------|---------|------|------------|
| `ENVIRONMENT` | Ortam tanımlayıcı | Hayır | `test` | `production` |
| `BACKEND_PORT` | Backend dış port | Hayır | `8081` | `8080` |
| `FRONTEND_PORT` | Frontend dış port | Hayır | `3001` | `80` |
| `SERVER_HOST` | Sunucu IP/domain (nginx için) | Hayır | boş (localhost fallback) | sunucu IP veya domain |
| `APP_VERSION` | Uygulama sürümü (CI tarafından doldurulur) | Hayır | `dev` | release tag |

### Veritabanı (MSSQL)

| Değişken | Açıklama | Secret? |
|----------|----------|---------|
| `MSSQL_PORT` | SQL Server dış port | Hayır |
| `MSSQL_DATABASE` | Veritabanı adı | Hayır |
| `MSSQL_SA_PASSWORD` | SQL Server SA parolası | **Evet** |
| `DATABASE_CONNECTION_STRING` | Tam bağlantı dizesi (yalnızca prod) | **Evet** |

### Object Storage (MinIO)

| Değişken | Açıklama | Secret? |
|----------|----------|---------|
| `MINIO_API_PORT` | MinIO API dış port | Hayır |
| `MINIO_CONSOLE_PORT` | MinIO Console dış port | Hayır |
| `MINIO_ROOT_USER` | MinIO root kullanıcı adı | **Evet** |
| `MINIO_ROOT_PASSWORD` | MinIO root parolası | **Evet** |
| `MINIO_BUCKET` | Varsayılan bucket adı | Hayır |

### Güvenlik

| Değişken | Açıklama | Secret? |
|----------|----------|---------|
| `JWT_SECRET` | JWT imzalama anahtarı (min 32 karakter) | **Evet** |
| `Seed__DefaultAdminPassword` | İlk admin hesabı parolası | **Evet** |

### Frontend / OAuth (opsiyonel)

| Değişken | Açıklama | Secret? |
|----------|----------|---------|
| `VITE_API_BASE_URL` | Frontend'in backend'e erişim URL'i | Hayır |
| `VITE_OAUTH_GOOGLE_URL` | Google OAuth başlatma URL'i | Hayır |
| `VITE_OAUTH_MICROSOFT_URL` | Microsoft OAuth başlatma URL'i | Hayır |

> OAuth değişkenleri tanımlanmazsa login ekranındaki Google/Microsoft butonları otomatik olarak pasif (disabled) kalır.

### Monitoring (Grafana)

| Değişken | Açıklama | Secret? |
|----------|----------|---------|
| `GRAFANA_ADMIN_USER` | Grafana admin kullanıcı adı | Hayır |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin parolası | **Evet** |

## Güvenlik Kuralları

1. **Gerçek `.env` dosyaları repoya eklenmez** — `.gitignore` tarafından dışlanır
2. **Sadece `.example` dosyaları repoda tutulur** — placeholder değerler içerir
3. **Secret'lar güvenli kanal üzerinden paylaşılır** — ekip içi iletişimde şifreli kanal kullan
4. **Production parolaları güçlü olmalıdır** — minimum 16 karakter, karışık (büyük/küçük harf, rakam, sembol)
5. **JWT_SECRET minimum 32 karakter** olmalıdır; `openssl rand -base64 48` ile üretilebilir

## Ortam Farkları

| Özellik | Test | Production |
|---------|------|------------|
| MSSQL Port | 1434 | 1433 |
| MinIO API Port | 9002 | 9000 |
| MinIO Console Port | 9003 | 9001 |
| Database Adı | CargoPilotTest | CargoPilot |
| VITE_APP_ENV | test | production |

## Sunucuda Kurulum

Sunucuda `.env` dosyaları el ile oluşturulur ve sadece sunucuda saklanır:

```bash
# Sunucuya SSH ile bağlan
ssh user@sunucu-ip

# Proje dizinine geç
cd /opt/cargo-pilot

# .example'dan kopyala
cp infra/env/.env.test.example infra/env/.env.test

# Değerleri düzenle
nano infra/env/.env.test

# Docker Compose'u başlat
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up -d
```
