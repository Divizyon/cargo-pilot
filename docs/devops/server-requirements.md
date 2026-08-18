# Sunucu Gereksinimleri

**Son güncelleme:** 2026-08-18 · **Durum:** Aktif · **Görev:** US-D01-I, F1-02

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

### Kaynak Kullanımı (Prod + Test) — F1-02 ile güncellendi

> **Düzeltme (F1-02 / D-39):** Aşağıdaki "MSSQL × 2 ≈ 4 GB" tahmini **geçersizdi** — bir
> MSSQL instance'ının kendisi zaten 2–4 GB istiyor (yukarıdaki bileşen tablosu), iki
> instance için toplamı 4 GB'a sabitlemek bir hesap hatasıydı. Ayrıca hiçbir serviste
> `mem_limit` tanımlı olmadığından (D-38) SQL Server varsayılan olarak **host RAM'inin
> %80'ini** hedefliyordu — "4 GB" sadece bir varsayımdı, hiçbir yerde uygulanmıyordu.
>
> `infra/compose/*.yml` içine artık her serviste `mem_limit` var (bkz. commit
> `infra/kaynak-limitleri`); aşağıdaki tablo artık **tahmin değil, compose
> dosyalarında tanımlı, uygulanan tavan** değerleridir.

```
RAM (mem_limit ile sınırlanmış — infra/compose/*.yml, F1-02):
  ├── Frontend × 2 (prod+test)        512 MB   (256 MB × 2)
  ├── Backend × 2                     1024 MB  (512 MB × 2)
  ├── MSSQL × 2 (mem_limit)           6144 MB  (3072 MB × 2)
  │     └─ MSSQL_MEMORY_LIMIT_MB      2048 MB/instance (SQL Server "max server
  │                                   memory" hedefi; mem_limit'in altında)
  ├── MinIO × 2                       1024 MB  (512 MB × 2)
  └── Monitoring stack × 2 (prod+test) 3456 MB (loki 512 + promtail 128 +
                                       node-exporter 64 + cadvisor 256 +
                                       prometheus 512 + grafana 256 = 1728 × 2)
  ─────────────────────────────────────────────────────────────
  Yapılandırılmış tavan toplamı   ≈ 12.16 GB / 16 GB  (%74)
  Kalan pay (OS + Docker daemon + burst) ≈ 4.1 GB / 16 GB  (%26)

  Not: `erp-mssql` / `erp-mssql-init` (docker-compose.test.yml, `--profile e2e`)
  bu bütçeye dahil değildir — yalnızca GitHub Actions runner'ında (CI) kalkar,
  bu sunucuda hiç çalışmaz.

Disk:
  ├── OS + Docker images              ~23 GB
  ├── MSSQL data                      ~1–5 GB
  └── MinIO data                      ~1–10 GB
  ─────────────────────────────────────────────
  Toplam tahmini     < 40 GB / 147 GB  (%16)  — VARSAYIM, ölçülmedi
```

{% hint style="success" %}
**Sonuç: Yeterli.** Yapılandırılmış bellek tavanlarının toplamı (≈12.16 GB) 16 GB
sunucu kapasitesinin altında kalıyor ve OS + Docker daemon için ≈4.1 GB (%26) pay
bırakıyor. `mem_limit` değerleri ölçülmüş gerçek kullanım değil, D-38/D-39 kapsamında
konulmuş muhafazakâr tavanlardır (bkz. F1-02); ilk prod yükünden sonra gerçek kullanımla
karşılaştırılıp gerekirse ayarlanmalıdır.
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
