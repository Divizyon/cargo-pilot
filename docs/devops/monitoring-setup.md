# Monitoring Altyapısı

**Görevler:** US-D19-I, US-D20-I, US-D21-I, US-D28-I, US-D29-I  
**Tarih:** 2026-04-25  
**Durum:** Test ortamı aktif — D21 bekliyor, D20 kanel kararı bekliyor

---

## Task Durum Tablosu

| Task | Başlık | Durum | Not |
|------|--------|-------|-----|
| US-D28-I | Prometheus Metrik Toplama | ✅ Tamamlandı | Backend scrape `health: up` |
| US-D19-I | Log Toplama Altyapısı | ✅ Tamamlandı | Loki+Promtail çalışıyor |
| US-D29-I | Grafana Dashboard Kurulumu | ✅ Tamamlandı | Grafana 10.3.3 aktif |
| US-D20-I | Hata Log Uyarıları | ⚠️ Kısmen | Kurallar var, bildirim kanalı yok |
| US-D21-I | Temel Metrik İzleme | ❌ Yapılmadı | node_exporter gerekiyor |

---

## Tamamlanan Tasklar

### US-D28-I — Prometheus Metrik Toplama ✅

**Ne yapıldı:**
- `prometheus-net.AspNetCore` NuGet eklendi
- `UseHttpMetrics()` + `MapMetrics("/metrics")` backend'e eklendi
- Prometheus container `cargo-pilot-prometheus-test` çalışıyor (port 9091)
- Backend hedefi scrape ediliyor: `cargo-pilot-backend-test → health: up`

**Mevcut metrikler (`/metrics` endpoint):**
- HTTP request rate, duration, in-flight sayısı
- .NET GC heap, thread pool, runtime metrikleri

---

### US-D19-I — Log Toplama Altyapısı ✅

**Ne yapıldı:**
- `Serilog.AspNetCore` + `Serilog.Sinks.Console` + `Serilog.Formatting.Compact` eklendi
- `Program.cs`'e `builder.Host.UseSerilog(...)` — stdout'a compact JSON yazar (`@t/@l/@m`)
- `appsettings.json`'a Serilog MinimumLevel config eklendi
- Loki container `cargo-pilot-loki-test` çalışıyor (iç ağ, 3100)
- Promtail container `cargo-pilot-promtail-test` çalışıyor — Docker socket ile container loglarını toplar

**Log formatı örneği:**
```json
{"@t":"2026-04-25T10:00:00Z","@l":"Information","@m":"Request completed","StatusCode":200}
```

---

### US-D29-I — Grafana Dashboard Kurulumu ✅

**Ne yapıldı:**
- Grafana 10.3.3 container `cargo-pilot-grafana-test` çalışıyor (port 3002)
- Datasource provisioning: `Prometheus-Test` + `Loki-Test` otomatik yüklendi
- Dashboard `Cargo Pilot Overview` provisioning ile hazır (6 panel)

**Erişim:**
- URL: `http://104.247.163.42:3002`
- Kullanıcı: `admin` / Şifre: `.env.monitoring.test`'teki değer

**Dashboard panelleri:**
1. Request Rate (PromQL)
2. Error Rate 5xx — kırmızı threshold
3. P99 Latency
4. Aktif istek sayısı
5. .NET GC Heap
6. Error Log Stream (LogQL)

---

## Kısmen Tamamlanan Tasklar

### US-D20-I — Hata Log Uyarıları ⚠️

**Ne yapıldı:**
- 3 alert kuralı tanımlandı ve Grafana'ya provisioning ile yüklendi:
  - Yüksek 5xx oranı (>0.1 req/s, 2dk)
  - Fazla error log (>5/5dk, 2dk)
  - Backend health degraded

**Eksik:**
- Bildirim kanalı (Contact Point) tanımlanmadı — Circle platformu veya email/Slack karar bekliyor
- Kanal tanımlanmadan kurallar sadece Grafana içinde görünür, dışarı bildirim atmaz

---

## Yapılmamış Tasklar

### US-D21-I — Temel Metrik İzleme Kurulumu ❌

Bu task **sunucu ve container bazlı sistem metriklerini** kapsar — backend uygulama metriklerinden (D28) farklıdır.

**Gereksinim:** CPU kullanımı, RAM, disk, network, container kaynak tüketimi

**Yapılması gerekenler:**
1. `node_exporter` container ekle — sunucu OS metrikleri (CPU, RAM, disk, network)
2. `cAdvisor` container ekle — container bazlı kaynak metrikleri
3. `prometheus.test.yml`'a yeni scrape hedefleri ekle
4. Grafana'ya sistem dashboard'u ekle (Grafana ID: 1860 — Node Exporter Full)

**Yeni portlar gerekmez** — node_exporter ve cAdvisor iç ağda çalışır.

---

## Test Edilmesi Gereken Maddeler

### Grafana'da yapılacak manuel kontroller

| Kontrol | Nerede | Beklenen |
|---------|--------|---------|
| Prometheus veri geliyor mu? | Dashboards → Cargo Pilot Overview | Request Rate panelinde değer görünmeli |
| Loki log geliyor mu? | Explore → Loki-Test → `{job="cargo-pilot-test"}` | Log satırları görünmeli |
| Alert kuralları aktif mi? | Alerting → Alert Rules | 3 kural "Normal" veya "Pending" durumda |
| Datasource bağlantısı | Connections → Data Sources → Test | Her ikisi yeşil |

---

## Sunucudaki Dosya Yapısı

```
/opt/cargo-pilot/
├── infra/
│   ├── compose/
│   │   ├── docker-compose.test.yml           (uygulama stack)
│   │   ├── docker-compose.monitoring.test.yml (monitoring stack — CI'dan bağımsız)
│   │   └── docker-compose.monitoring.prod.yml (prod için hazır)
│   ├── docker/
│   │   ├── prometheus/prometheus.test.yml
│   │   ├── loki/loki-config.yml
│   │   ├── promtail/promtail.test.yml
│   │   └── grafana/provisioning/...
│   └── env/
│       ├── .env.monitoring.test              (sunucuda mevcut, git'te yok)
│       └── .env.monitoring.test.example      (şablon, git'te var)
```

---

## Monitoring Stack Komutları

```bash
# Durumu gör
docker ps | grep -E 'loki|promtail|prometheus|grafana'

# Yeniden başlat (config değişikliğinde)
docker compose \
  -f /opt/cargo-pilot/infra/compose/docker-compose.monitoring.test.yml \
  --env-file /opt/cargo-pilot/infra/env/.env.monitoring.test \
  up -d --force-recreate

# Logları gör
docker logs cargo-pilot-grafana-test --tail=50
docker logs cargo-pilot-loki-test --tail=50
```

---

## Port Tablosu

| Servis | Prod Port | Test Port | Durum |
|--------|-----------|-----------|-------|
| Grafana | 3000 | 3002 | Test ✅ / Prod ❌ bekliyor |
| Prometheus | 9090 | 9091 | Test ✅ / Prod ❌ bekliyor |
| Loki | iç ağ | iç ağ | Test ✅ / Prod ❌ bekliyor |
| node_exporter | — | — | ❌ D21 için yapılacak |
