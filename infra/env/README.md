# Infra Environment Yapılandırması

Bu klasör, Docker Compose ve altyapı servisleri için ortam değişkenlerini içerir.

## Dosya Yapısı

```
infra/env/
├── .env.dev.example      # Development ortamı örneği
├── .env.test.example     # Test ortamı örneği
├── .env.prod.example     # Production ortamı örneği
└── README.md             # Bu dosya
```

## Kullanım

### 1. Örnek Dosyayı Kopyala

```bash
# Development için
cp infra/env/.env.dev.example infra/env/.env.dev

# Test için
cp infra/env/.env.test.example infra/env/.env.test

# Production için
cp infra/env/.env.prod.example infra/env/.env.prod
```

### 2. Değerleri Düzenle

- **Development:** Hazır default değerler local için çalışır, gerekirse düzenle
- **Test/Production:** Placeholder değerleri gerçek değerlerle değiştir

### 3. Docker Compose ile Kullan

> **Not:** Compose dosyaları US-D03e story'sinde tamamlanacaktır.

```bash
# Development
docker compose -f infra/compose/docker-compose.dev.yml --env-file infra/env/.env.dev up -d

# Test
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up -d

# Production
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod up -d
```

## Değişken Referansı

| Değişken | Açıklama | Secret? |
|----------|----------|---------|
| `ENVIRONMENT` | Ortam tanımlayıcı (development/test/production) | Hayır |
| `MSSQL_PORT` | SQL Server dış port numarası | Hayır |
| `MSSQL_DATABASE` | Veritabanı adı | Hayır |
| `MSSQL_SA_PASSWORD` | SQL Server SA kullanıcı parolası | **Evet** |
| `MINIO_API_PORT` | MinIO API dış port numarası | Hayır |
| `MINIO_CONSOLE_PORT` | MinIO Console dış port numarası | Hayır |
| `MINIO_ROOT_USER` | MinIO root kullanıcı adı | **Evet** |
| `MINIO_ROOT_PASSWORD` | MinIO root parolası | **Evet** |
| `MINIO_BUCKET` | Varsayılan bucket adı (oluşturma davranışı US-D03d'de tanımlanır) | Hayır |

## Güvenlik Notları

1. **Gerçek `.env` dosyaları repoya eklenmez** - `.gitignore` tarafından dışlanır
2. **Sadece `.example` dosyaları repoda tutulur** - placeholder değerler içerir
3. **Production parolaları güçlü olmalıdır** - minimum 16 karakter, karışık karakterler
4. **Secret'ları paylaşma** - güvenli kanallar kullan (secret manager, encrypted chat vb.)

## Ortam Farkları

| Özellik | Development | Test | Production |
|---------|-------------|------|------------|
| MSSQL Port | 1433 | 1434 | 1433 |
| MinIO API Port | 9000 | 9002 | 9000 |
| MinIO Console Port | 9001 | 9003 | 9001 |
| Parola Gücü | Basit (geliştirme kolaylığı) | Orta | **Güçlü** |
| Database Adı | CargoPilotDev | CargoPilotTest | CargoPilot |

> **Not:** Test ortamında farklı portlar kullanılır, böylece development ve test ortamları aynı makinede çakışmadan çalışabilir.
