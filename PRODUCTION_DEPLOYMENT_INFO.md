# Cargo Pilot - Production Deployment Bilgileri

**Deployment Tarihi:** [DEPLOYMENT_DATE]
**Deployment Tipi:** Production
**Sunucu:** [SERVER_INFO]

---

## 🎯 Deployment Durumu

✅ **TÜM SERVİSLER BAŞARIYLA AYAĞA KALKTI**

| Servis | Durum | Port | Health Check |
|--------|-------|------|--------------|
| Frontend | ✅ Çalışıyor | 80 | HTTP 200 |
| Backend | ✅ Çalışıyor | 8080 | Healthy |
| MSSQL Server | ✅ Healthy | 1433 | Healthy |
| MinIO | ✅ Healthy | 9000, 9001 | HTTP 200 |

---

## 📊 MSSQL Server Bağlantı Bilgileri

### Sunucu Dışından Bağlantı
```
Server: <SUNUCU_IP_ADRESI>,1433
Database: CargoPilot
User ID: sa
Password: <MSSQL_SA_PASSWORD>
Trust Server Certificate: True
```

### Connection String (Sunucu Dışından)
```
Server=<SUNUCU_IP_ADRESI>,1433;Database=CargoPilot;User Id=sa;Password=xeuhO/7bsuR/BjZ35MVzLkjh26xrs45n;TrustServerCertificate=True;
```

### Connection String (Docker İçi - Backend için)
```
Server=mssql,1433;Database=CargoPilot;User Id=sa;Password=xeuhO/7bsuR/BjZ35MVzLkjh26xrs45n;TrustServerCertificate=True;
```

### MSSQL Versiyon
```
Microsoft SQL Server 2022 (RTM-CU24-GDR) (KB5083252) - 16.0.4250.1 (X64)
Standard Edition (64-bit) on Linux (Ubuntu 22.04.5 LTS)
```

---

## 🗄️ MinIO Object Storage Bağlantı Bilgileri

### MinIO API Endpoint
```
Internal (Docker): http://minio:9000
External: http://<SUNUCU_IP_ADRESI>:9000
```

### MinIO Console
```
URL: http://<SUNUCU_IP_ADRESI>:9001
```

### Credentials
```
Root User: <MINIO_ROOT_USER>
Root Password: <MINIO_ROOT_PASSWORD>
```

### Bucket
```
Bucket Name: cargo-pilot
Not: Bucket henüz oluşturulmadı, backend tarafından otomatik oluşturulabilir.
```

### MinIO Versiyon
```
MinIO RELEASE.2022-01-08T03-11-54Z
Not: Eski CPU uyumluluğu için 2022 versiyonu kullanıldı
```

---

## 🚀 Backend & Frontend Erişim

### Frontend
```
URL: http://<SUNUCU_IP_ADRESI>:80
Durum: Nginx ile serve ediliyor
```

### Backend API
```
URL: http://<SUNUCU_IP_ADRESI>:8080
Health Endpoint: http://<SUNUCU_IP_ADRESI>:8080/health
Durum: ASP.NET Core 8.0 Production Mode
```

---

## 📦 Database Migration

### ⚠️ ÖNEMLİ: Migration Henüz Çalıştırılmadı

Veritabanı oluşturuldu ancak tablolar henüz yaratılmadı.
Backend ekibi aşağıdaki yöntemlerden biriyle migration çalıştırmalı:

### Yöntem 1: Yerel Makineden Migration (Önerilen)

Backend developer'ı kendi makinasından şu adımları izleyecek:

1. .NET SDK 8.0 kurulu olduğundan emin olun
2. Repository'yi clone edin
3. `apps/backend` dizinine gidin
4. Environment variable'ı set edin:

**Windows PowerShell:**
```powershell
$env:ConnectionStrings__DefaultConnection = "Server=<SUNUCU_IP_ADRESI>,1433;Database=CargoPilot;User Id=sa;Password=xeuhO/7bsuR/BjZ35MVzLkjh26xrs45n;TrustServerCertificate=True;"
```

**Linux/macOS:**
```bash
export ConnectionStrings__DefaultConnection="Server=<SUNUCU_IP_ADRESI>,1433;Database=CargoPilot;User Id=sa;Password=xeuhO/7bsuR/BjZ35MVzLkjh26xrs45n;TrustServerCertificate=True;"
```

5. Migration'ı çalıştırın:
```bash
dotnet ef database update --project CargoPilot.Infrastructure --startup-project CargoPilot.WebAPI
```

### Yöntem 2: SQL Script ile Migration

1. Migration script'i generate edin:
```bash
dotnet ef migrations script --project CargoPilot.Infrastructure --startup-project CargoPilot.WebAPI --output migration.sql
```

2. Script'i MSSQL Server'a uygulayın

### Migration Doğrulama

Migration başarıyla çalıştıktan sonra şu komutu çalıştırıp tabloları görebilirsiniz:

```bash
docker exec cargo-pilot-mssql-prod /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "xeuhO/7bsuR/BjZ35MVzLkjh26xrs45n" -C -Q "SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo')"
```

---

## 🐳 Docker Container Yönetimi

### Tüm Container'ları Görmek
```bash
docker ps -a | grep cargo-pilot
```

### Log Kontrolü
```bash
# Backend logs
docker logs cargo-pilot-backend-prod

# Frontend logs
docker logs cargo-pilot-frontend-prod

# MSSQL logs
docker logs cargo-pilot-mssql-prod

# MinIO logs
docker logs cargo-pilot-minio-prod
```

### Container'ları Yeniden Başlatma
```bash
# Tüm stack'i yeniden başlat
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod restart

# Tek bir servisi yeniden başlat
docker restart cargo-pilot-backend-prod
```

### Container'ları Durdurma
```bash
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod down
```

### Container'ları Tekrar Ayağa Kaldırma
```bash
docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod up -d
```

---

## 🔒 Güvenlik Notları

1. **Secret Yönetimi**
   - Tüm parolalar `/opt/cargo-pilot/infra/env/.env.prod` dosyasında
   - Bu dosya 600 izinleri ile korunuyor (sadece root okuyabilir)
   - Git'e eklenmedi (.gitignore ile korumalı)

2. **Firewall Ayarları**
   - Gerekirse sadece gerekli portları dışarıya açın
   - Frontend: 80 (HTTP)
   - Backend: 8080
   - MSSQL: 1433 (sadece güvenilir IP'ler için)
   - MinIO Console: 9001 (sadece admin erişimi için)

3. **SSL/HTTPS**
   - Production'da reverse proxy (Nginx/Caddy) arkasında çalıştırılmalı
   - SSL sertifikası eklenmelidir

---

## 🛠️ Troubleshooting

### Backend Çalışmıyorsa
```bash
# Logları kontrol et
docker logs cargo-pilot-backend-prod

# Container'ı yeniden başlat
docker restart cargo-pilot-backend-prod
```

### MSSQL Bağlantı Hatası
```bash
# MSSQL container sağlıklı mı kontrol et
docker ps | grep mssql

# MSSQL loglarını kontrol et
docker logs cargo-pilot-mssql-prod

# Connection string'in doğru olduğunu doğrula
```

### MinIO Erişim Problemi
```bash
# MinIO health check
curl http://localhost:9000/minio/health/live

# MinIO Console'a browser'dan eriş
http://<SUNUCU_IP_ADRESI>:9001
```

---

## 📝 Yapılması Gerekenler (Backend Ekibi İçin)

- [ ] Database migration çalıştır
- [ ] Backend API endpoints test et
- [ ] MinIO bucket oluştur (otomatik veya manuel)
- [ ] Frontend'den backend'e bağlantıyı test et
- [ ] SSL sertifikası ekle (production için)
- [ ] Monitoring/logging kurulumu yap
- [ ] Backup stratejisi belirle

---

## 📞 Teknik Detaylar

**Deployment Method:** Docker Compose
**Docker Version:** 29.4.0
**Docker Compose Version:** v5.1.3
**Node.js Version:** v22.22.2 (build için kullanıldı)
**Backend Framework:** ASP.NET Core 8.0
**Frontend Framework:** React 18 + Vite
**Database:** MSSQL Server 2022 Standard Edition
**Object Storage:** MinIO RELEASE.2022-01-08

---

## 🔗 İlgili Dosyalar

- Environment: `/opt/cargo-pilot/infra/env/.env.prod`
- Docker Compose: `/opt/cargo-pilot/infra/compose/docker-compose.prod.yml`
- Backend Source: `/opt/cargo-pilot/apps/backend`
- Frontend Source: `/opt/cargo-pilot/apps/frontend`

---

**Not:** Bu dosyada `<SUNUCU_IP_ADRESI>` placeholder'ları sunucunun gerçek IP adresi ile değiştirilmelidir.
