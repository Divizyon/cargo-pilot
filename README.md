# 🚢 Cargo Pilot

Yük planlama süreçlerini dijitalleştiren ve optimize eden web platformu.

{% hint style="success" %}
**Test ortamı aktif** — [http://cargopilot.divizyon.org](http://cargopilot.divizyon.org) üzerinden erişilebilir.
{% endhint %}

---

## Hızlı Başlangıç

```bash
# 1. Repo'yu klonla
git clone <repo-url> && cd cargo-pilot

# 2. Ortam dosyasını hazırla
cp infra/env/.env.test.example infra/env/.env.test

# 3. Stack'i başlat
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up -d
```

**Default login:** `admin@cargopilot.com` — parola için `docs/setup/local-setup.md`'ye bakın. Test sunucusunda parola `SEED_DEFAULT_ADMIN_PASSWORD` secret'ından gelir.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | .NET 8 |
| Database | SQL Server 2022 (MSSQL) |
| Object Storage | MinIO |
| 3D Görselleştirme | Three.js |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions + GHCR |
| Monitoring | Prometheus + Grafana + Loki |

---

## Repository Yapısı

```
cargo-pilot/
├── .github/          # GitHub Actions workflow'ları ve PR şablonu
├── apps/
│   ├── frontend/     # React + Vite + TypeScript
│   └── backend/      # .NET 8 Web API
├── database/         # Migration, seed ve DB scriptleri
├── docs/             # Proje dokümantasyonu
│   ├── algorithm/    # Yerleştirme algoritması: kurallar, kararlar, ölçüm günlüğü, ADR, arşiv
│   ├── archive/      # Tarihsel doküman arşivi (geçmiş denetimler ve planlar)
│   ├── context/      # Proje bağlamı, anlık görüntüler, doküman haritası
│   ├── conventions/  # Branching ve commit kuralları
│   ├── devops/       # Sunucu, monitoring, secret yönetimi
│   └── setup/        # Local kurulum
├── infra/
│   ├── compose/      # Docker Compose dosyaları
│   ├── env/          # Ortam değişkeni örnekleri (.example)
│   ├── docker/       # Servis config dosyaları (Grafana, Loki, Prometheus…)
│   ├── nginx/        # Reverse proxy config
│   └── scripts/      # Backup, rollback scriptleri
└── tests/            # E2E ve entegrasyon testleri
```

---

## Ortam Durumu

| Ortam | URL | Durum |
|-------|-----|-------|
| Test | `http://cargopilot.divizyon.org` | ✅ Aktif |
| Production | `http://104.247.163.42:80` | ⚠️ Henüz deploy edilmedi |
| Grafana (Test) | `http://104.247.163.42:3002` | ✅ Aktif |

---

## Dokümanlar

{% content-ref url="docs/setup/local-setup.md" %}
[Local Setup](docs/setup/local-setup.md)
{% endcontent-ref %}

{% content-ref url="docs/conventions/branching.md" %}
[Branching Strategy](docs/conventions/branching.md)
{% endcontent-ref %}

{% content-ref url="docs/devops/server-access.md" %}
[Sunucu Erişim & Ağ](docs/devops/server-access.md)
{% endcontent-ref %}

{% content-ref url="docs/devops/known-issues.md" %}
[Bilinen Sorunlar](docs/devops/known-issues.md)
{% endcontent-ref %}

---

## Katkı Sağlama

Depoya katkı sağlamadan önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun: branch modeli, commit kuralları ve PR süreci orada özetlenir.

Bu depo özel telif hakkına tabidir, tüm hakları saklıdır — bkz. [LICENSE](LICENSE).
