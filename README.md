# Cargo Pilot

Cargo Pilot, yük planlama süreçlerini dijitalleştirmek ve daha verimli hale getirmek için geliştirilen bir web platformudur.

Bu repository; uygulama kodunu, altyapı yapılandırmalarını, veritabanı bileşenlerini, testleri ve proje dokümantasyonlarını bir arada barındırır.

---

## Proje Amacı

Cargo Pilot'un amacı; ürün, koli ve araç bilgilerini kullanarak yükleme süreçlerini daha yönetilebilir, izlenebilir ve geliştirilebilir hale getiren bir platform sunmaktır.

Proje kapsamında genel olarak şu alanlar hedeflenir:

- yük ve araç verilerinin yönetimi
- yük planlama süreçlerinin desteklenmesi
- raporlama ve çıktı üretimi
- yerel geliştirme ortamının standardize edilmesi
- CI/CD ve deployment süreçlerinin kurgulanması

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | .NET 8 |
| **Database** | SQL Server (MSSQL) |
| **Object Storage** | MinIO |
| **3D Görselleştirme** | Three.js |
| **Containerization** | Docker |

---

## Repository Yapısı

```text
.
├── .github/        # GitHub workflow ve PR şablonları
├── apps/           # Uygulama katmanları (frontend / backend)
├── database/       # Veritabanı migration, seed ve script yapıları
├── docs/           # Proje dokümantasyonları
├── infra/          # Docker, compose ve environment örnekleri
├── scripts/        # Build, deploy ve local geliştirme yardımcı scriptleri
├── tests/          # Test yapıları
└── README.md
```

### Temel Klasörler

**`apps/`** — Frontend ve backend uygulama kodlarını içerir.

**`database/`** — Veritabanı ile ilgili migration, seed ve diğer veritabanı bileşenlerini içerir.

**`docs/`** — Projede kullanılan kurallar ve yardımcı dokümanları içerir.

**`infra/`** — Docker, Docker Compose ve environment örnek dosyalarını içerir.

**`scripts/`** — Sık kullanılan build, deploy ve geliştirme yardımcı scriptlerini içerir.

**`tests/`** — Test dosyalarını ve test senaryolarını içerir.

---

## Başlangıç

Projeyi local ortamda ayağa kaldırmak için:

1. **Repository'yi klonlayın:**

```bash
git clone <repo-url>
cd cargo-pilot
```

2. **Ortam dosyasını hazırlayın:**

```bash
cp infra/env/.env.test.example infra/env/.env.test
```

3. **Docker ile başlatın:**

```bash
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up -d
```

Detaylı kurulum adımları için: [Local Setup](docs/setup/local-setup.md)

Default login: `admin@cargopilot.com / Admin@CargoPilot1!`

---

## Geliştirme Kuralları

Repository üzerinde çalışırken aşağıdaki dokümanlara uyulmalıdır:

* [BRANCHING.md](docs/conventions/BRANCHING.md) — Branch yapısı, PR yaklaşımı ve merge kuralları
* [COMMITS.md](docs/conventions/COMMITS.md) — Commit mesajı ve atomic commit yaklaşımı
* [PR Template](.github/pull_request_template.md) — Pull Request açarken kullanılacak şablon

---

## Geliştirme Akışı

Önerilen temel geliştirme akışı:

1. `git fetch origin` ile remote güncellenir
2. `git checkout -b feature/US-XXX-description origin/main` ile yeni branch açılır
3. Geliştirme yapılır
4. Local ortamda test edilir
5. Commit atılır
6. `git pull origin main` ile son değişiklikler alınır
7. `git push origin feature/US-XXX-description` ile push yapılır
8. Pull Request açılır
9. Review ve kontroller tamamlandıktan sonra merge edilir

Detaylı branch ve commit kuralları ilgili dokümanlarda yer alır.

---

## Ortam Yönetimi

Projede branch yapısı ile ortam yönetimi birbirinden ayrıdır.

* Branch'ler geliştirme akışını yönetir
* Ortamlar ise deployment ve configuration seviyesinde yönetilir

Test ve prod ortamlarına ilişkin detaylar CI/CD ve infra yapıları üzerinden ele alınır.

---

## Notlar

* Gerçek secret bilgileri repository içine eklenmemelidir
* Environment dosyalarında örnek değerler kullanılmalıdır
* Local geliştirme için mümkün olduğunca container tabanlı akış tercih edilmelidir

---

## İlgili Dokümanlar

* [Local Setup](docs/setup/local-setup.md) — Yerel ortam kurulumu
* [Branching Strategy](docs/conventions/BRANCHING.md) — Branch yönetimi ve PR kuralları
* [Commit Kuralları](docs/conventions/COMMITS.md) — Commit yazım kuralları
