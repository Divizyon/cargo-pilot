# Monitoring Altyapısı

**Görevler:** US-D19-I, US-D20-I, US-D21-I, US-D28-I, US-D29-I  
**Tarih:** 2026-04-25  
**Durum:** Test ortamı aktif — D20 bildirim kanalı kararı bekliyor

---

## Task Durum Tablosu

| Task | Başlık | Durum | Not |
|------|--------|-------|-----|
| US-D28-I | Prometheus Metrik Toplama | ✅ Tamamlandı | Backend scrape `health: up` |
| US-D19-I | Log Toplama Altyapısı | ✅ Tamamlandı | Loki + Promtail çalışıyor |
| US-D29-I | Grafana Dashboard Kurulumu | ✅ Tamamlandı | Grafana 10.3.3 aktif, 2 dashboard |
| US-D21-I | Temel Metrik İzleme | ✅ Tamamlandı | node_exporter + cAdvisor eklendi |
| US-D20-I | Hata Log Uyarıları | ⚠️ Kısmen | 3 kural var, bildirim kanalı tanımlanmadı |

---

## Mimari

```
backend stdout (Serilog compact JSON)
  └─► Promtail (Docker socket) ──► Loki ──────────────────────┐
                                                               │
backend /metrics (prometheus-net)                              ▼
  └─► Prometheus ◄── node_exporter (OS)              Grafana (UI + Alerting)
                  ◄── cAdvisor (containers)
```

Monitoring stack uygulama stack'inden **bağımsız** ayrı bir compose dosyasında çalışır.  
Mevcut `cargo-pilot-test-network`'e `external: true` ile katılır — CI/CD pipeline'ı etkilemez.

---

## İlk Kurulum (Sıfırdan Başlıyorsan)

### Ön koşul
- Uygulama stack'i (`docker-compose.test.yml`) çalışıyor olmalı — `cargo-pilot-test-network` var olmalı
- Sunucuda `/opt/cargo-pilot/` dizini mevcut olmalı

### 1. Env dosyasını oluştur
```bash
cp /opt/cargo-pilot/infra/env/.env.monitoring.test.example \
   /opt/cargo-pilot/infra/env/.env.monitoring.test

# Dosyayı aç ve şifreyi gir:
nano /opt/cargo-pilot/infra/env/.env.monitoring.test
```

`.env.monitoring.test` içeriği:
```
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<güvenli-şifre>
```

### 2. Monitoring stack'i başlat
```bash
docker compose \
  -f /opt/cargo-pilot/infra/compose/docker-compose.monitoring.test.yml \
  --env-file /opt/cargo-pilot/infra/env/.env.monitoring.test \
  up -d
```

### 3. Kontrol et
```bash
docker ps | grep -E 'loki|promtail|prometheus|grafana|node-exporter|cadvisor'
# 6 container çalışmalı
```

### 4. Grafana'ya gir
- URL: `http://104.247.163.42:3002`
- Kullanıcı: `admin` / Şifre: `.env.monitoring.test`'teki değer

---

## Config Güncelleme (Var Olan Stack'i Güncelleme)

```bash
cd /opt/cargo-pilot
git pull origin <branch>

docker compose \
  -f infra/compose/docker-compose.monitoring.test.yml \
  --env-file infra/env/.env.monitoring.test \
  up -d --force-recreate
```

---

## Stack Bileşenleri

### US-D28-I — Prometheus Metrik Toplama ✅

- `prometheus-net.AspNetCore` NuGet ile backend `/metrics` endpoint'i açıldı
- `UseHttpMetrics()` + `MapMetrics("/metrics")` DependencyInjection.cs'e eklendi
- Prometheus container: `cargo-pilot-prometheus-test` (port 9091 dışa açık)
- Scrape hedefleri: backend, node-exporter, cAdvisor

**Mevcut metrikler:**
- `http_requests_received_total` — istek sayısı (method/code/path label'lı)
- `http_request_duration_seconds` — latency histogram
- `http_requests_in_progress` — anlık aktif istek sayısı
- `dotnet_total_memory_bytes` — .NET managed heap
- `process_working_set_bytes` — process working set

---

### US-D19-I — Log Toplama Altyapısı ✅

- `Serilog.AspNetCore` + `Serilog.Sinks.Console` + `Serilog.Formatting.Compact` NuGet eklendi
- Backend stdout'a compact JSON yazar: `{"@t":"...","@l":"Information","@m":"..."}`
- Loki container: `cargo-pilot-loki-test` (iç ağ, port 3100)
- Promtail container: `cargo-pilot-promtail-test` — Docker socket ile backend+frontend container loglarını toplar
- Promtail `level` label'ını Serilog'un `@l` alanından regex ile çıkarır

---

### US-D29-I — Grafana Dashboard Kurulumu ✅

- Grafana 10.3.3, port 3002 — datasource + dashboard + alert kuralları provisioning ile yüklenir
- **Datasource:** Prometheus-Test, Loki-Test (otomatik, elle yapılandırma gerekmez)

**Dashboard: Cargo Pilot Overview**
1. Request Rate (req/s)
2. Error Rate 5xx (kırmızı threshold > 0.1)
3. P99 Latency (gauge, sarı > 500ms, kırmızı > 1s)
4. Active Requests (anlık sayaç)
5. .NET Memory (managed heap + working set)
6. Error Logs (Loki stream, level=Error filtreli)

**Dashboard: System Metrics**
1. CPU Usage % (gauge, sarı > 70%, kırmızı > 90%)
2. Memory Usage % (gauge)
3. Disk Usage % (gauge)
4. Available Memory (stat)
5. CPU per Core (timeline)
6. Memory Timeline (total/used/available)
7. Network I/O (RX/TX, veth/lo hariç)
8. Disk I/O (read/write)
9. Container CPU Usage (cargo-pilot-* container'ları)
10. Container Memory Usage (cargo-pilot-* container'ları)

---

### US-D21-I — Temel Metrik İzleme ✅

- `node_exporter:v1.7.0` — sunucu OS metrikleri (CPU, RAM, disk, network) — iç ağda
- `cAdvisor:v0.49.1` — container bazlı kaynak metrikleri — iç ağda, privileged
- Her ikisi de host porta bind edilmez; sadece Prometheus scrape eder

---

### US-D20-I — Hata Log Uyarıları ⚠️

3 alert kuralı provisioning ile Grafana'ya yüklendi:

| Kural | Koşul | Süre | Severity |
|-------|-------|------|---------|
| Yüksek 5xx Hata Oranı | `sum(rate(http_requests_received_total{code=~"5.."}[5m])) > 0.1` | 2dk | critical |
| Fazla Error Log | Son 5dk'da > 5 error log | 2dk | warning |
| Backend Health Degraded | `up{job="cargo-pilot-backend-test"} < 1` | 1dk | critical |

**Eksik:** Bildirim kanalı (Contact Point) tanımlanmadı.  
Kurallar Grafana içinde "Normal/Alerting" durumu gösterir ama dışarı (email/Slack/webhook) bildirim atmaz.  
Karar alınınca `infra/docker/grafana/provisioning/alerting/contact-points.yml` dosyası eklenmeli.

---

## Sorun Giderme

```bash
# Container'ların durumunu gör
docker ps | grep -E 'loki|promtail|prometheus|grafana|node-exporter|cadvisor'

# Log kontrol
docker logs cargo-pilot-grafana-test --tail=50
docker logs cargo-pilot-loki-test --tail=50
docker logs cargo-pilot-promtail-test --tail=50
docker logs cargo-pilot-node-exporter-test --tail=20
docker logs cargo-pilot-cadvisor-test --tail=20

# Prometheus hedef durumu (browser'da)
http://104.247.163.42:9091/targets
# cargo-pilot-backend-test, node-exporter-test, cadvisor-test → "up" görünmeli

# Loki'ye log geliyor mu
docker exec cargo-pilot-promtail-test wget -qO- http://cargo-pilot-loki-test:3100/ready
```

---

## Dosya Yapısı

```
/opt/cargo-pilot/
├── infra/
│   ├── compose/
│   │   ├── docker-compose.test.yml                (uygulama stack — CI yönetir)
│   │   ├── docker-compose.monitoring.test.yml     (monitoring stack — elle yönetilir)
│   │   └── docker-compose.monitoring.prod.yml     (prod için hazır — prod app deploy edilince)
│   ├── docker/
│   │   ├── prometheus/
│   │   │   ├── prometheus.test.yml                (3 scrape hedefi)
│   │   │   └── prometheus.prod.yml
│   │   ├── loki/loki-config.yml
│   │   ├── promtail/
│   │   │   ├── promtail.test.yml
│   │   │   └── promtail.prod.yml
│   │   └── grafana/
│   │       ├── provisioning/
│   │       │   ├── datasources/datasources.test.yml
│   │       │   ├── dashboards/dashboard-provider.yml
│   │       │   └── alerting/alert-rules.test.yml
│   │       └── dashboards/
│   │           ├── cargo-pilot-overview.json      (uygulama metrikleri + loglar)
│   │           └── system-metrics.json            (sunucu + container kaynakları)
│   └── env/
│       ├── .env.monitoring.test                   (sunucuda — git'te YOK)
│       └── .env.monitoring.test.example           (şablon — git'te var)
```

---

## Port Tablosu

| Servis | Test Port | Prod Port | Durum |
|--------|-----------|-----------|-------|
| Grafana | 3002 | 3000 | Test ✅ |
| Prometheus | 9091 | 9090 | Test ✅ |
| Loki | iç ağ | iç ağ | Test ✅ |
| node_exporter | iç ağ | iç ağ | Test — sunucu güncellemesi bekleniyor |
| cAdvisor | iç ağ | iç ağ | Test — sunucu güncellemesi bekleniyor |
| Prod stack | — | — | ❌ prod app deploy edilince başlatılacak |
