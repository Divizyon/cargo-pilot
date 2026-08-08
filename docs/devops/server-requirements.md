# Sunucu Gereksinimleri

**Son güncelleme:** 2026-04-23 · **Durum:** Aktif · **Görev:** US-D01-I

Bu doküman mevcut sunucunun kapasitesini, bileşen bazlı kaynak gereksinimlerini ve prod + test ortamlarının birlikte çalışabilirliğini özetler.

---

## Mevcut Sunucu

| Özellik | Değer |
|---------|-------|
| IP / FQDN | `104.247.163.42` / `cargopilot.divizyon.org` |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | 6.8.0-110-generic |
| CPU | 8 vCPU @ 2.0 GHz (QEMU/KVM) |
| RAM | 16 GB |
| Disk | 147 GB SSD |
| Docker | 29.4.1 |
| Docker Compose | v5.1.3 |

---

## Kapasite Analizi

### Bileşen Bazlı Gereksinimler

| Bileşen | CPU | RAM | Disk |
|---------|-----|-----|------|
| Frontend (Nginx) | 0.1 vCPU | 64 MB | — |
| Backend (.NET 8) | 0.5–1 vCPU | 256–512 MB | — |
| MSSQL Server 2022 | 1–2 vCPU | 2–4 GB | 20+ GB |
| MinIO | 0.25 vCPU | 256 MB | 50+ GB |
| Docker daemon + OS | 0.5 vCPU | 512 MB | 10 GB |
| **Minimum (tek ortam)** | **2.5 vCPU** | **3.5 GB** | **80 GB** | |
| **Önerilen (prod + test)** | **4+ vCPU** | **8+ GB** | **150+ GB** | |

### Tahmini Kaynak Kullanımı (Prod + Test)

```
RAM:
  ├── OS + Docker daemon              ~512 MB
  ├── Frontend × 2 (prod+test)        ~128 MB
  ├── Backend × 2                     ~512 MB
  ├── MSSQL × 2                       ~4 GB
  ├── MinIO × 2                       ~256 MB
  └── Monitoring stack                ~1.5 GB
  ─────────────────────────────────────────────
  Toplam tahmini     ≈ 6.9 GB / 16 GB  (%43)

Disk:
  ├── OS + Docker images              ~23 GB
  ├── MSSQL data                      ~1–5 GB
  └── MinIO data                      ~1–10 GB
  ─────────────────────────────────────────────
  Toplam tahmini     < 40 GB / 147 GB  (%16)
```

{% hint style="success" %}
**Sonuç: Yeterli.** Mevcut sunucu kapasitesi prod + test + monitoring stack'i aynı anda çalıştırmaya yeterlidir. Image build CI'da GHCR'a push edildiğinden sunucuda OOM riski yoktur.
{% endhint %}

---

## Ortam Yapısı

| Ortam | Branch | Frontend | Backend | MSSQL | MinIO |
|-------|--------|----------|---------|-------|-------|
| Production | `main` | 80 | 8080 | 1433 | 9000/9001 |
| Test | `test` | 3001 | 8081 | 1434 | 9002/9003 |

---

## Aktif Servisler

| Servis | Durum | Port |
|--------|-------|------|
| cargo-pilot-frontend-test | ✅ | 3001 |
| cargo-pilot-backend-test | ✅ | 8081 |
| cargo-pilot-mssql-test | ✅ | 1434 |
| cargo-pilot-minio-test | ✅ | 9002/9003 |
| cargo-pilot-prometheus-test | ✅ | 9091 |
| cargo-pilot-grafana-test | ✅ | 3002 |
| cargo-pilot-loki-test | ✅ | iç ağ |
| cargo-pilot-promtail-test | ✅ | iç ağ |
| cargo-pilot-*-prod | ⚠️ | — |

{% hint style="warning" %}
Production stack henüz deploy edilmemiştir. Detaylar için bkz. [Bilinen Sorunlar](known-issues.md).
{% endhint %}

---

## Öneriler

1. **Production stack deploy edilmeli** — `.env.prod` oluşturulup `docker-compose.prod.yml` ayağa kaldırılmalı
2. **Monitoring** ✅ — Prometheus + Grafana + Loki test ortamında aktif
3. **Yedekleme** ✅ — Cron ile otomatik, prod 02:00 / test 03:00
4. **Firewall** ✅ — UFW aktif, fail2ban SSH koruma sağlıyor
