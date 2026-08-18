# Monitoring & Alerting

**Son güncelleme:** 2026-08-04 · **Durum:** Aktif · **Görev:** US-D19-I, US-D20-I, US-D21-I, US-D28-I, US-D29-I

Bu doküman Prometheus, Loki/Promtail ve Grafana ile kurulu monitoring stack'in mimarisini, kurulum adımlarını, alert kurallarını ve sorun giderme yöntemlerini açıklar.

---

## Genel Bakış

| Görev | Başlık | Durum |
|-------|--------|-------|
| US-D28-I | Prometheus Metrik Toplama | ✅ Tamamlandı |
| US-D19-I | Log Toplama (Loki + Promtail) | ✅ Tamamlandı |
| US-D29-I | Grafana Dashboard Kurulumu | ✅ Tamamlandı |
| US-D21-I | Temel Metrik İzleme (node\_exporter, cAdvisor) | ✅ Tamamlandı |
| US-D20-I | Hata Log Uyarıları | ⚠️ Kısmen — bildirim kanalı eksik |

---

## Mimari

```
backend stdout (Serilog compact JSON)
  └─► Promtail (Docker socket) ──► Loki ──────────────────────┐
                                                               │
backend /metrics (prometheus-net)                              ▼
  └─► Prometheus ◄── node_exporter (OS metrikleri)    Grafana (UI + Alerting)
                  ◄── cAdvisor (container metrikleri)
```

{% hint style="info" %}
Monitoring stack uygulama stack'inden **bağımsız** ayrı bir compose dosyasında çalışır. CI/CD pipeline'ını etkilemez. `cargo-pilot-test-network`'e `external: true` ile katılır.
{% endhint %}

---

## İlk Kurulum

### Ön koşul

Uygulama stack'i (`docker-compose.test.yml`) çalışıyor olmalı — `cargo-pilot-test-network` var olmalı.

{% tabs %}
{% tab title="🧪 Test" %}
**1. Env dosyasını oluştur:**

```bash
cp /opt/cargo-pilot/infra/env/.env.monitoring.test.example \
   /opt/cargo-pilot/infra/env/.env.monitoring.test

nano /opt/cargo-pilot/infra/env/.env.monitoring.test
```

İçerik:

```
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<güvenli-şifre>
```

**2. Stack'i başlat:**

```bash
docker compose \
  -f /opt/cargo-pilot/infra/compose/docker-compose.monitoring.test.yml \
  --env-file /opt/cargo-pilot/infra/env/.env.monitoring.test \
  up -d
```

**3. Grafana'ya gir:**

- URL: `http://104.247.163.42:3002` — **test ortamının host portu 3002'dir** (container içi port her
  iki ortamda da 3000; eşleme `docker-compose.monitoring.test.yml:89` → `"3002:3000"`).
- Kullanıcı: `admin` / Şifre: env dosyasındaki değer

> **Not (2026-08-15):** Bu dokümanda Grafana için iki farklı port geçer ve **bu bir çelişki değil,
> ortam farkıdır** — test 3002, production 3000. Kanıt: `docker-compose.monitoring.test.yml:89`
> (`"3002:3000"`) ve `docker-compose.monitoring.prod.yml:87` (`"3000:3000"`).
> Canlı probda (2026-08-15) test sunucusunda 3002 açık, 3000 kapalıydı — prod monitoring stack'i
> henüz deploy edilmemiştir.
{% endtab %}

{% tab title="🚀 Production" %}
**1. Env dosyasını oluştur:**

```bash
cp /opt/cargo-pilot/infra/env/.env.monitoring.prod.example \
   /opt/cargo-pilot/infra/env/.env.monitoring.prod

nano /opt/cargo-pilot/infra/env/.env.monitoring.prod
```

**2. Stack'i başlat:**

```bash
docker compose \
  -f /opt/cargo-pilot/infra/compose/docker-compose.monitoring.prod.yml \
  --env-file /opt/cargo-pilot/infra/env/.env.monitoring.prod \
  up -d
```

**3. Grafana'ya gir:**

- URL: `http://104.247.163.42:3000` — **production'ın host portu 3000'dir**
  (`docker-compose.monitoring.prod.yml:87` → `"3000:3000"`). Test ortamıyla karıştırmayın: orada 3002.
  Bu stack 2026-08-15 itibarıyla **henüz deploy edilmemiştir** (port kapalı).
{% endtab %}
{% endtabs %}

**Container kontrolü:**

```bash
docker ps | grep -E 'loki|promtail|prometheus|grafana|node-exporter|cadvisor'
# 6 container çalışmalı
```

---

## Config Güncelleme

```bash
cd /opt/cargo-pilot
git pull origin <branch>

docker compose \
  -f infra/compose/docker-compose.monitoring.test.yml \
  --env-file infra/env/.env.monitoring.test \
  up -d --force-recreate
```

---

## Bileşenler

### Prometheus — Metrik Toplama

- Backend `/metrics` endpoint'i `prometheus-net.AspNetCore` ile açıldı
- Scrape hedefleri: backend, node\_exporter, cAdvisor

**Mevcut metrikler:**

| Metrik | Açıklama |
|--------|----------|
| `http_requests_received_total` | İstek sayısı (method/code/path label'lı) |
| `http_request_duration_seconds` | Latency histogram |
| `http_requests_in_progress` | Anlık aktif istek sayısı |
| `dotnet_total_memory_bytes` | .NET managed heap |
| `process_working_set_bytes` | Process working set |

### Loki & Promtail — Log Toplama

- Backend stdout'a Serilog compact JSON yazar
- Promtail Docker socket üzerinden container loglarını toplar
- `level` label'ı Serilog'un `@l` alanından regex ile çıkarılır

### Grafana Dashboards

**Cargo Pilot Overview:**
Request Rate • Error Rate 5xx • P99 Latency • Active Requests • .NET Memory • Error Logs

**System Metrics:**
CPU Usage • Memory Usage • Disk Usage • Network I/O • Disk I/O • Container CPU/Memory

### Alert Kuralları

Ortam başına 6 kural tanımlı — prod `alert-rules.prod.yml`, test `alert-rules.test.yml`
(toplam 12 kural, 6+6, ortamlar arası UID çakışması yok):

| Kural | Koşul | Süre | Severity |
|-------|-------|------|---------|
| Yüksek 5xx Hata Oranı | `sum(rate(...{code=~"5.."}[5m])) > 0.1` | 2 dk | critical |
| Fazla Error Log | Son 5dk'da > 5 error log | 2 dk | warning |
| Backend Health Degraded | `up{job="cargo-pilot-backend-<env>"} < 1` | 1 dk | critical |
| Yüksek CPU Kullanımı | CPU > %75 | — | warning |
| Yüksek RAM Kullanımı | RAM > %80 | — | warning |
| Yüksek Disk Kullanımı | Disk > %80 | — | warning |

{% hint style="info" %}
**Prod/test ayrımı (D-42, 2026-08-18).** `infra/docker/grafana/provisioning/alerting/` dizininde
her config'in iki kopyası var: `*.prod.yml` ve `*.test.yml` (alert-rules, contact-points,
notification-policies). Compose dosyaları **dizini değil, tek tek dosyaları** mount eder ve
container içinde ortak ada (`alert-rules.yml` vb.) yeniden bağlar — bu yüzden prod Grafana'sı
asla test kurallarını/contact point'lerini yüklemez ve tersi. Eskiden tüm dizin mount ediliyordu;
bu durumda prod, `prometheus-test`/`loki-test` datasource UID'lerine bakan test kurallarını da
yüklüyor, veri bulamıyordu. Yeni bir ortam-özel dosya eklerken **dizin mount'a geri dönme** —
`docker-compose.monitoring.<env>.yml` içine açık dosya mount'u ekle.
{% endhint %}

{% hint style="warning" %}
**Bildirim gitmiyor — SMTP eksik.** `contact-points.{prod,test}.yml` ve
`notification-policies.{prod,test}.yml` provisioning dosyaları mevcut; ancak compose dosyalarında
`GF_SMTP_*` env var'ları tanımlı olmadığı için e-posta gönderilemiyor. Çözüm: Grafana servisine
`GF_SMTP_HOST/USER/PASSWORD/FROM_ADDRESS` eklenmeli (bkz. devops-backlog 2.4).
{% endhint %}

---

## Sorun Giderme

```bash
# Container durumu
docker ps | grep -E 'loki|promtail|prometheus|grafana|node-exporter|cadvisor'

# Log kontrol
docker logs cargo-pilot-grafana-test --tail=50
docker logs cargo-pilot-loki-test --tail=50
docker logs cargo-pilot-promtail-test --tail=50

# Prometheus hedef durumu (tarayıcıda)
# http://104.247.163.42:9091/targets
# → backend, node-exporter, cadvisor "up" görünmeli

# Loki'ye log geliyor mu?
docker exec cargo-pilot-promtail-test wget -qO- http://cargo-pilot-loki-test:3100/ready
```

<details>

<summary>Loki 503 veriyor / Grafana DatasourceNoData</summary>

Loki log dosyası şişmiş olabilir. Kontrol edin:

```bash
docker inspect cargo-pilot-loki-test | grep LogPath
# Çıkan yoldaki dosya boyutunu kontrol et

# Truncate et
truncate -s 0 <log-path>

# Loki'yi restart et
docker restart cargo-pilot-loki-test
```

Kalıcı çözüm: `docker-compose.monitoring.test.yml`'deki `loki` ve `cadvisor` servislerine `logging:` bloğu ekle (`max-size: 100m, max-file: "3"`).

</details>

---

## Dosya Yapısı

```
infra/
├── compose/
│   ├── docker-compose.monitoring.test.yml
│   └── docker-compose.monitoring.prod.yml
├── docker/
│   ├── prometheus/
│   │   ├── prometheus.test.yml
│   │   └── prometheus.prod.yml
│   ├── loki/loki-config.yml
│   ├── promtail/
│   │   ├── promtail.test.yml
│   │   └── promtail.prod.yml
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   │   ├── datasources.prod.yml
│       │   │   └── datasources.test.yml
│       │   ├── dashboards/dashboard-provider.yml
│       │   └── alerting/          # dizin değil, dosya bazlı mount edilir (bkz. Alert Kuralları)
│       │       ├── alert-rules.prod.yml
│       │       ├── alert-rules.test.yml
│       │       ├── contact-points.prod.yml
│       │       ├── contact-points.test.yml
│       │       ├── notification-policies.prod.yml
│       │       └── notification-policies.test.yml
│       └── dashboards/
│           ├── cargo-pilot-overview.json
│           └── system-metrics.json
└── env/
    ├── .env.monitoring.test          # sunucuda — git'te YOK
    ├── .env.monitoring.test.example  # şablon — git'te var
    ├── .env.monitoring.prod          # sunucuda — git'te YOK
    └── .env.monitoring.prod.example  # şablon — git'te var
```
