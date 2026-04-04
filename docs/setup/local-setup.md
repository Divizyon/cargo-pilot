# Local Setup

Bu doküman, Cargo Pilot projesini local geliştirme ortamında ayağa kaldırmak için izlenecek temel adımları açıklar.

Amaç; projeyi yeni alan bir geliştiricinin minimum eforla sistemi çalıştırabilmesini sağlamaktır.

---

## 1. Ön Koşullar

Projeyi local ortamda çalıştırmadan önce aşağıdaki araçların makinede kurulu olması beklenir:

- Git
- Docker
- Docker Compose
- Node.js (frontend tarafında local geliştirme yapılacaksa)
- .NET SDK (backend tarafında container dışı geliştirme yapılacaksa)

> Not: Docker tabanlı akış tercih edildiği için temel çalışma modeli container üzerinden ilerler.

---

## 2. Repository'yi Alma

İlgili repository clone edilir:

```bash
git clone <repo-url>
cd <repo-name>
```

Repository alındıktan sonra `main` branch güncel hale getirilir:

```bash
git pull origin main
```

---

## 3. Ortam Dosyaları

Projede ortam değişkenleri `infra/env` altında örnek dosyalar üzerinden yönetilir.

Beklenen yaklaşım:

* örnek ortam dosyaları kopyalanır
* local geliştirme için gerekli değerler düzenlenir
* gerçek secret değerleri repository içine eklenmez

Örnek dosyalar:

* `infra/env/.env.dev.example`
* `infra/env/.env.test.example`
* `infra/env/.env.prod.example`

Local geliştirme için uygun örnek dosya kullanılarak gerçek `.env` dosyası hazırlanmalıdır.

Örnek yaklaşım:

```bash
cp infra/env/.env.dev.example infra/env/.env.dev
```

Gerekli alanlar ekipte belirlenen değerlere göre güncellenmelidir.

---

## 4. Projeyi Ayağa Kaldırma

Local geliştirme ortamı Docker Compose üzerinden çalıştırılır.

Tüm temel bileşenlerin birlikte ayağa kalkması beklenir:

* frontend
* backend
* MSSql
* Min.IO

İlgili compose dosyasının bulunduğu konuma göre aşağıdaki komutlardan uygun olanı çalıştırılır:

```bash
docker compose up -d
```

veya

```bash
docker-compose up -d
```

Eğer belirli bir compose dosyası kullanılıyorsa:

```bash
docker compose -f infra/compose/docker-compose.dev.yml up -d
```

Eğer proje kökünde compose dosyası varsa doğrudan `docker compose up -d` yeterlidir.

> Not: Compose dosyalarının güncel konumu için `infra/compose/` klasörünü kontrol edin.

Container'ların durumunu kontrol etmek için:

```bash
docker ps
```

Log görmek için:

```bash
docker compose logs -f
```

Belirli bir servis için:

```bash
docker compose logs -f backend
```

---

## 5. Migration ve Seed

Veritabanı ilk kez ayağa kalktığında migration ve gerekiyorsa seed adımları uygulanmalıdır.

Beklenen yaklaşım:

* migration'lar çalıştırılır
* gerekiyorsa başlangıç verileri yüklenir
* sistem minimum kullanılabilir veri ile açılır

Eğer migration container içinden yönetiliyorsa ilgili backend container üzerinden çalıştırılmalıdır.
Eğer local .NET SDK üzerinden çalıştırılıyorsa ekipte belirlenen standart komut kullanılmalıdır.

Örnek yaklaşım:

```bash
dotnet ef database update
```

Seed veriler kullanılıyorsa:

* admin kullanıcı
* temel rol kayıtları
* örnek araç / ürün / kural verileri

local veya test ortamında yüklenebilir.

> Not: Seed veriler geliştirme ve test amaçlıdır. Production ortamında kontrollü kullanılmalıdır.

---

## 6. Local Erişim Bilgileri

Servislerin local ortamda hangi portlardan çalıştığı compose ve env dosyalarına göre değişebilir.
Güncel değerler ilgili docker compose ve env dosyalarından kontrol edilmelidir.

Örnek erişim yapısı:

* Frontend: `http://localhost:<frontend-port>`
* Backend: `http://localhost:<backend-port>`
* MSSql: `localhost:<mssql-port>`
* Min.IO: `http://localhost:<minio-port>`

Eğer Min.IO console açıksa ayrıca ayrı bir port üzerinden erişilebilir.

---

## 7. Geliştirme Sırasında Sık Kullanılan Komutlar

Container'ları durdurmak için:

```bash
docker compose down
```

Container'ları durdurup volume'leri de temizlemek için:

```bash
docker compose down -v
```

Image'ları yeniden build ederek ayağa kaldırmak için:

```bash
docker compose up --build -d
```

Belirli bir servisi yeniden başlatmak için:

```bash
docker compose restart <service-name>
```

---

## 8. Sık Karşılaşılan Problemler

### Port çakışması

Bir servis beklenen portta açılmıyorsa aynı portu kullanan başka bir uygulama olabilir.
İlgili port kontrol edilmeli ve gerekiyorsa env / compose üzerinden güncellenmelidir.

### Container ayağa kalkmıyor

Aşağıdaki kontroller yapılmalıdır:

* env dosyaları eksik mi
* image build hatası var mı
* volume veya network hatası var mı
* bağımlı servisler hazır mı

Log kontrolü yapılmalıdır:

```bash
docker compose logs -f
```

### Veritabanı bağlantı hatası

Aşağıdakiler kontrol edilmelidir:

* MSSql container çalışıyor mu
* connection string doğru mu
* ilgili port açık mı
* migration uygulanmış mı

### Min.IO erişim problemi

Aşağıdakiler kontrol edilmelidir:

* Min.IO container çalışıyor mu
* endpoint bilgisi doğru mu
* access key / secret key doğru mu
* env dosyaları güncel mi

---

## 9. Beklenen Geliştirme Akışı

Local geliştirme sırasında önerilen temel akış:

1. `git fetch origin` ile remote güncellenir
2. `git checkout -b feature/US-XXX-description origin/main` ile yeni branch açılır
3. Gerekli geliştirme yapılır
4. Local ortamda test edilir
5. Gerekirse migration / seed uygulanır
6. Commit atılır
7. `git pull origin main` ile son değişiklikler alınır
8. `git push origin feature/US-XXX-description` ile push yapılır
9. Pull Request açılır

Branch ve commit kuralları için ilgili dokümanlara bakılmalıdır.

---

## İlgili Dokümanlar

* [Branching Strategy](../conventions/BRANCHING.md) — Branch yönetimi ve PR kuralları
* [Commit Kuralları](../conventions/COMMITS.md) — Commit yazım kuralları
