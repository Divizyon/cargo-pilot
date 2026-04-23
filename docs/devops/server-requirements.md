# Sunucu Gereksinim Analizi

**Görev:** US-D01-I  
**Tarih:** 2026-04-23  
**Durum:** Tamamlandı

---

## 1. Bileşen Bazlı Kaynak Gereksinimleri

| Bileşen | CPU | RAM | Disk | Notlar |
|---------|-----|-----|------|--------|
| Frontend (Nginx) | 0.1 vCPU | 64 MB | — | Statik dosya servisi |
| Backend (.NET 8) | 0.5–1 vCPU | 256–512 MB | — | API sunucusu |
| MSSQL Server 2022 | 1–2 vCPU | 2–4 GB | 20+ GB | Veritabanı |
| MinIO | 0.25 vCPU | 256 MB | 50+ GB | Object storage |
| Docker daemon + OS | 0.5 vCPU | 512 MB | 10 GB | Altyapı |
| **Minimum Toplam** | **2.5 vCPU** | **3.5 GB** | **80 GB** | Tek ortam |
| **Önerilen (prod + test)** | **4+ vCPU** | **8+ GB** | **150+ GB** | İki ortam |

---

## 2. Mevcut Sunucu Özellikleri

**Sunucu:** `104.247.163.42` / `cargopilot.divizyon.org`

| Özellik | Değer |
|---------|-------|
| **İşletim Sistemi** | Ubuntu 24.04.4 LTS (Noble Numbat) |
| **Kernel** | 6.8.0-110-generic |
| **CPU** | 8 vCPU @ 2.0 GHz (QEMU/KVM sanal) |
| **RAM** | 16 GB |
| **Disk** | 147 GB SSD (16 GB kullanımda, %12) |
| **Docker** | 29.4.1 |
| **Docker Compose** | v5.1.3 |
| **Public IP** | 104.247.163.42/24 |

---

## 3. Kapasite Değerlendirmesi

### Mevcut Durum (Tek Sunucu)
```
RAM kullanımı:
  ├── OS + Docker daemon   ~512 MB
  ├── Frontend (Nginx)     ~64 MB × 2 (prod+test)   = 128 MB
  ├── Backend (.NET 8)     ~256 MB × 2              = 512 MB
  ├── MSSQL 2022           ~2 GB × 2                = 4 GB
  ├── MinIO                ~128 MB × 2              = 256 MB
  └── Toplam tahmini       ≈ 5.4 GB / 16 GB (%34)

Disk kullanımı:
  ├── OS + Docker images    ~16 GB (mevcut)
  ├── MSSQL data            ~1-5 GB (büyüme var)
  ├── MinIO data            ~1-10 GB (büyüme var)
  └── Toplam tahmini        < 40 GB / 147 GB (%27)
```

### Sonuç: ✅ Yeterli
Mevcut sunucu kapasitesi prod + test ortamlarını aynı anda çalıştırmaya fazlasıyla yeterli.

---

## 4. Ortam Yapısı

| Ortam | Branch | Portlar |
|-------|--------|---------|
| **Production** | `main` | Frontend: 80, Backend: 8080, MSSQL: 1433, MinIO: 9000/9001 |
| **Test** | `test` | Frontend: 3001, Backend: 8081, MSSQL: 1434, MinIO: 9002/9003 |

---

## 5. Aktif Servisler (2026-04-23 itibarıyla)

| Servis | Durum | Port |
|--------|-------|------|
| cargo-pilot-frontend-test | ✅ Çalışıyor | 3001 |
| cargo-pilot-backend-test | ✅ Çalışıyor | 8081 |
| cargo-pilot-mssql-test | ✅ Çalışıyor | 1434 |
| cargo-pilot-minio-test | ✅ Çalışıyor | 9002/9003 |
| cargo-pilot-*-prod | ⚠️ Henüz kurulmadı | — |

> **Not:** Production stack henüz deploy edilmemiştir. `.env.prod` dosyası sunucuda oluşturulmalıdır.

---

## 6. Öneriler

1. **Production stack deploy edilmeli** — `.env.prod` oluşturulup `docker-compose.prod.yml` ayağa kaldırılmalı (bkz. US-D02)
2. **Monitoring** için ek kaynak ayrılabilir: Prometheus + Grafana ~512 MB RAM (bkz. US-D21)
3. **Yedekleme:** MSSQL data volume ve MinIO data volume için düzenli snapshot alınmalı (bkz. US-D18)
4. **Firewall:** Şu an tüm portlar açık — gereksiz portlar kapatılmalı (bkz. US-D02)
