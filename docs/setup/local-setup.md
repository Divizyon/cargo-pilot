# Local Setup

Bu doküman, Cargo Pilot projesini local geliştirme ortamında ayağa kaldırmak için izlenecek adımları açıklar.

---

## Ön Koşullar

| Araç | Zorunlu | Not |
|------|---------|-----|
| Git | ✅ | |
| Docker + Docker Compose | ✅ | Temel çalışma modu container üzerinden |
| Node.js + npm | Frontend geliştirme için | `npm run dev` akışı için |
| .NET SDK | Backend geliştirme için | Container dışı çalışma için |
| [GitHub CLI (`gh`)](https://cli.github.com/) | Önerilir | PR açma ve CI takibi için |

---

## 1. Repository'yi Al

```bash
git clone <repo-url>
cd cargo-pilot
git pull origin test
```

---

## 2. Ortam Dosyasını Hazırla

```bash
cp infra/env/.env.test.example infra/env/.env.test
```

{% hint style="warning" %}
`<CHANGE_ME_...>` ile işaretlenmiş alanlar gerçek değerlerle doldurulmalıdır. Gerçek değerler için ekip liderinden veya sunucudaki `.env.test` dosyasından alabilirsiniz.

Secret yönetimi için bkz. [Secret Yönetimi](../devops/secret-management.md).
{% endhint %}

---

## 3. Stack'i Başlat

{% tabs %}
{% tab title="🐳 Tam Docker (Önerilir)" %}
Tüm servisler container içinde çalışır. Frontend hot-reload yoktur; image build gerekir.

```bash
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test up -d
```

{% hint style="info" %}
Image'lar GHCR'dan otomatik çekilir (`ghcr.io/divizyon/cargo-pilot-*:test`). Package'lar **public**'tir — login veya PAT gerekmez.
{% endhint %}

Local build için:

```bash
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test up --build -d
```
{% endtab %}

{% tab title="⚡ Vite + Docker (Frontend Geliştirme)" %}
Frontend Vite üzerinden çalışır (hot-reload), backend + DB Docker'da kaldırılır. CORS sorunu yoktur — Vite'ın proxy'si `/api` isteklerini backend container'a yönlendirir.

**Adım 1 — Backend stack'i başlat:**

```bash
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test up -d mssql minio backend
```

**Adım 2 — Frontend'i Vite ile başlat:**

```bash
cd apps/frontend
npm install
npm run dev
```

**Erişim:**

| Servis | Adres |
|--------|-------|
| Frontend (Vite) | `http://localhost:3001` |
| Backend API | `http://localhost:8081` |
| MinIO Console | `http://localhost:9003` |

{% hint style="info" %}
Farklı bir backend portu kullanıyorsanız:

```bash
VITE_DEV_PROXY_TARGET=http://localhost:8081 npm run dev
```
{% endhint %}
{% endtab %}
{% endtabs %}

---

## 4. Migration & Seed

```bash
# Backend container içinden migration çalıştır
docker exec cargo-pilot-backend-test \
  dotnet ef database update
```

**Default login:** `admin@cargopilot.com` / `Admin@CargoPilot1!`

{% hint style="info" %}
Seed veriler yalnızca geliştirme ve test içindir. Production'da kontrollü kullanılmalıdır.
{% endhint %}

---

## 5. Local Erişim

| Servis | Adres |
|--------|-------|
| Frontend | `http://localhost:3001` |
| Backend API | `http://localhost:8081` |
| MinIO Console | `http://localhost:9003` |
| MSSQL | `localhost:1434` |

---

## 6. Geliştirme Akışı

```bash
# 1. Remote'u güncelle
git fetch origin

# 2. test branch'inden yeni branch aç (branching kuralı)
git checkout -b feature/US-XXX-aciklama origin/test

# 3. Geliştir, test et, commit at
git add <dosyalar>
git commit -m "kısa açıklayıcı mesaj"

# 4. Push et
git push origin feature/US-XXX-aciklama

# 5. dev'e PR aç, ardından aynı branch'ten test'e PR aç
gh pr create --base dev
```

{% hint style="info" %}
Branch ve commit kuralları için bkz. [Branching Strategy](../conventions/BRANCHING.md) ve [Commit Kuralları](../conventions/COMMITS.md).
{% endhint %}

---

## 7. Sık Kullanılan Komutlar

```bash
# Container durumunu gör
docker ps | grep cargo-pilot

# Logları takip et
docker compose -f infra/compose/docker-compose.test.yml logs -f

# Belirli servis logu
docker compose -f infra/compose/docker-compose.test.yml logs -f backend

# Stack'i durdur
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test down

# Volume'leri de temizle (DB sıfırlanır!)
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test down -v

# Yeniden build et
docker compose -f infra/compose/docker-compose.test.yml --env-file infra/env/.env.test up --build -d
```

---

## 8. Sık Karşılaşılan Sorunlar

<details>

<summary>Port çakışması</summary>

Aynı portu kullanan başka bir uygulama çalışıyor olabilir. İlgili portu kontrol edin:

```bash
lsof -i :3001   # veya 8081, 1434, 9003
```

Gerekirse `.env.test` içindeki port değerlerini değiştirin.

</details>

<details>

<summary>Container ayağa kalkmıyor</summary>

```bash
# Log kontrolü
docker compose -f infra/compose/docker-compose.test.yml logs -f

# Container detayı
docker inspect cargo-pilot-backend-test
```

Kontrol edilecekler: env dosyası eksik mi, image çekilebiliyor mu, bağımlı servisler hazır mı.

</details>

<details>

<summary>Veritabanı bağlantı hatası</summary>

```bash
# MSSQL container çalışıyor mu?
docker ps | grep mssql

# Bağlantı testi
docker exec cargo-pilot-mssql-test /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "<SA_PASSWORD>" -C -Q "SELECT 1"
```

Migration uygulandı mı kontrol edin.

</details>

<details>

<summary>MinIO erişim problemi</summary>

```bash
docker ps | grep minio
docker logs cargo-pilot-minio-test --tail=30
```

`.env.test` içindeki `MINIO_ROOT_USER` ve `MINIO_ROOT_PASSWORD` değerlerini kontrol edin.

</details>

---

## İlgili Dokümanlar

{% content-ref url="../conventions/BRANCHING.md" %}
[Branching Strategy](../conventions/BRANCHING.md)
{% endcontent-ref %}

{% content-ref url="../conventions/COMMITS.md" %}
[Commit Kuralları](../conventions/COMMITS.md)
{% endcontent-ref %}

{% content-ref url="../devops/secret-management.md" %}
[Secret Yönetimi](../devops/secret-management.md)
{% endcontent-ref %}

{% content-ref url="../devops/known-issues.md" %}
[Bilinen Sorunlar](../devops/known-issues.md)
{% endcontent-ref %}
