# Monitoring Altyapısı

**Görevler:** US-D19-I, US-D20-I, US-D28-I, US-D29-I  
**Tarih:** 2026-04-25  
**Durum:** Kod hazır — test ortamı kurulumu bekliyor

---

## 1. Genel Mimari

```
backend stdout (JSON/Serilog) ──► Promtail ──► Loki ──────────────┐
backend /metrics (prometheus-net) ──► Prometheus ─────────────────┤
                                                                   ▼
                                                             Grafana
                                                        (Dashboard + Alerting)
```

---

## 2. Backend Değişiklikleri

### Eklenen NuGet Paketler (`CargoPilot.WebAPI.csproj`)

| Paket | Amaç |
|-------|------|
| `Serilog.AspNetCore` | Yapılandırılmış JSON log yazımı |
| `Serilog.Sinks.Console` | stdout'a compact JSON formatında çıktı |
| `Serilog.Formatting.Compact` | Loki uyumlu `@t/@l/@m` JSON formatı |
| `prometheus-net.AspNetCore` | HTTP metriklerini `/metrics` endpoint'inde sunma |

### Kod Değişiklikleri

- **`Program.cs`** — `builder.Host.UseSerilog(...)` eklendi; stdout'a compact JSON yazar
- **`DependencyInjection.cs`** — `app.UseHttpMetrics()` + `app.MapMetrics("/metrics")` eklendi
- **`appsettings.json`** — `Serilog` config section eklendi (MinimumLevel overrides)
- **`appsettings.Development.json`** — Development için Debug seviyesi Serilog config

> Mevcut `ILogger<T>` kullanımlarına dokunulmadı — Serilog sadece altyapı katmanını değiştirdi.

---

## 3. Yeni Dosyalar

### Compose

| Dosya | Amaç |
|-------|------|
| `infra/compose/docker-compose.monitoring.prod.yml` | Prod monitoring stack (Loki, Promtail, Prometheus, Grafana) |
| `infra/compose/docker-compose.monitoring.test.yml` | Test monitoring stack |

> **Önemli:** Monitoring compose dosyaları uygulama compose dosyalarından **bağımsızdır**. CI/CD pipeline etkilenmez. Monitoring stack bir kez elle başlatılır ve sürekli çalışır.

### Prometheus

| Dosya | Amaç |
|-------|------|
| `infra/docker/prometheus/prometheus.prod.yml` | Prod backend scrape config (her 15s) |
| `infra/docker/prometheus/prometheus.test.yml` | Test backend scrape config |

### Loki

| Dosya | Amaç |
|-------|------|
| `infra/docker/loki/loki-config.yml` | Log saklama config — filesystem, 30 gün retention |

### Promtail

| Dosya | Amaç |
|-------|------|
| `infra/docker/promtail/promtail.prod.yml` | Docker socket üzerinden prod container loglarını toplar |
| `infra/docker/promtail/promtail.test.yml` | Test container loglarını toplar |

### Grafana

| Dosya | Amaç |
|-------|------|
| `infra/docker/grafana/provisioning/datasources/datasources.prod.yml` | Prometheus + Loki prod veri kaynakları |
| `infra/docker/grafana/provisioning/datasources/datasources.test.yml` | Prometheus + Loki test veri kaynakları |
| `infra/docker/grafana/provisioning/dashboards/dashboard-provider.yml` | Dashboard klasör tanımı |
| `infra/docker/grafana/dashboards/cargo-pilot-overview.json` | Hazır overview dashboard (6 panel) |
| `infra/docker/grafana/provisioning/alerting/alert-rules.yml` | Prod alert kuralları |
| `infra/docker/grafana/provisioning/alerting/alert-rules.test.yml` | Test alert kuralları |

### Dashboard Panelleri

1. Request Rate (req/s)
2. Error Rate 5xx — kırmızı threshold >0.1 req/s
3. P99 Latency
4. Aktif istek sayısı
5. .NET GC Heap boyutu
6. Error log stream (LogQL, level=Error)

### Alert Kuralları (D20)

| Kural | Koşul | Önem |
|-------|-------|------|
| Yüksek 5xx oranı | >0.1 req/s (2 dk) | critical |
| Fazla error log | >5 log/5dk (2 dk) | warning |
| Backend health degraded | `up` metric < 1 (1 dk) | critical |

> **Not:** Alert bildirim kanalı henüz tanımlanmadı. Kurallar hazır, kanal sonra eklenecek (Circle platformu değerlendiriliyor).

### Env

| Dosya | Amaç |
|-------|------|
| `infra/env/.env.monitoring.prod.example` | Prod Grafana admin şifresi şablonu |
| `infra/env/.env.monitoring.test.example` | Test Grafana admin şifresi şablonu |

---

## 4. Port Tablosu

| Servis | Prod Port | Test Port |
|--------|-----------|-----------|
| Grafana | 3000 | 3002 |
| Prometheus | 9090 | 9091 |
| Loki | iç ağ (3100) | iç ağ (3100) |
| Promtail | port yok | port yok |

UFW kuralları 2026-04-25 tarihinde eklendi (tüm 4 port açık).

---

## 5. Sunucuda Kurulum Adımları

### Ön Koşul

- Test stack çalışıyor olmalı (`cargo-pilot-test-network` mevcut) ✅  
- Prod stack için: önce prod app stack deploy edilmeli (`cargo-pilot-prod-network` henüz yok)

### Test Monitoring Kurulumu

```bash
ssh -i ~/.ssh/eyupece-cargo-pilot root@104.247.163.42
cd /opt/cargo-pilot

# 1. Env dosyasını oluştur
cp infra/env/.env.monitoring.test.example infra/env/.env.monitoring.test
nano infra/env/.env.monitoring.test
# → GRAFANA_ADMIN_PASSWORD=GucluBirSifre!

# 2. Stack'i başlat
docker compose \
  -f infra/compose/docker-compose.monitoring.test.yml \
  --env-file infra/env/.env.monitoring.test \
  up -d

# 3. Kontrol
docker ps | grep -E 'loki|promtail|prometheus|grafana'
```

### Prod Monitoring Kurulumu (Prod App Stack Kurulduktan Sonra)

```bash
cp infra/env/.env.monitoring.prod.example infra/env/.env.monitoring.prod
nano infra/env/.env.monitoring.prod
# → GRAFANA_ADMIN_PASSWORD=BaskaBirGucluSifre!

docker compose \
  -f infra/compose/docker-compose.monitoring.prod.yml \
  --env-file infra/env/.env.monitoring.prod \
  up -d
```

### Grafana'ya Giriş

| Ortam | URL | Kullanıcı |
|-------|-----|-----------|
| Test | `http://104.247.163.42:3002` | admin / `.env`'deki şifre |
| Prod | `http://104.247.163.42:3000` | admin / `.env`'deki şifre |

---

## 6. Monitoring Stack Güncelleme

Monitoring container'ları uygulama deploylarından bağımsızdır. Config değişikliği olursa:

```bash
docker compose \
  -f infra/compose/docker-compose.monitoring.test.yml \
  --env-file infra/env/.env.monitoring.test \
  up -d --force-recreate
```

---

## 7. Yapılacaklar

- [ ] Test branch'e merge sonrası sunucuda test monitoring kurulumu
- [ ] Grafana'ya giriş yapıp dashboard ve alertleri doğrula
- [ ] Alert bildirim kanalını tanımla (Circle / email / Slack)
- [ ] Prod app stack deploy edilince prod monitoring kurulumu
