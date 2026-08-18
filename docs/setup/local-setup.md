# Local Setup

**Son güncelleme:** 2026-08-15 · **Durum:** Aktif

Cargo Pilot projesini local geliştirme ortamında ayağa kaldırmak için izlenecek adımları açıklar.

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

Local'de elle migration çalıştırmanıza gerek yoktur. Backend container ayağa kalkarken
`Program.cs` içinde `DbInitializer.InitializeAsync()` çağrılır; bu metod SQL Server
kullanıldığında önce `Database.MigrateAsync()` ile bekleyen tüm migration'ları uygular,
ardından seed verilerini yazar.

{% hint style="warning" %}
Backend image'ı ASP.NET **runtime** tabanlıdır; container içinde .NET SDK ve `dotnet ef`
aracı bulunmaz. Bu nedenle `docker exec ... dotnet ef database update` komutu çalışmaz.
Sunucuda migration'ı elle çalıştırmak gerekirse geçici SDK container'ı kullanılır —
adımlar için bkz. [Deployment › Database Migration](../devops/deployment.md).
{% endhint %}

### Seed davranışı

Seed, ortam bazlı çalışır (`DbInitializer.InitializeAsync`):

| Ortam | Demo şirket + `TestERP` entegrasyonu | Admin kullanıcısı |
|-------|--------------------------------------|-------------------|
| `Development` | Oluşturulur | Oluşturulur |
| Diğer (`Test`, `Production`, …) | **Oluşturulmaz** | Yalnızca `Seed__EnableAdminSeed=true` ise; ilk girişte **parola değişimi zorunlu** |

**Seed edilen admin e-postası:** `admin@cargopilot.com`

Parola sabit değildir; `Seed__DefaultAdminPassword` yapılandırma değerinden okunur ve
hiçbir dokümanda/repoda gerçek değeri tutulmaz. Kurulum sırasında placeholder'ı kendi
belirlediğiniz güçlü bir parolayla değiştirin:

```bash
# infra/env/.env.test  (Docker stack)
Seed__DefaultAdminPassword=<kendi belirlediğiniz güçlü parola>
```

```jsonc
// apps/backend/CargoPilot.WebAPI/appsettings.Development.json  (container dışı çalışma)
"Seed": { "DefaultAdminPassword": "<kendi belirlediğiniz güçlü parola>" }
```

{% hint style="warning" %}
`.env.test.example` bu alanı `<CHANGE_ME_ADMIN_PASSWORD>` placeholder'ı ile bırakır.
Placeholder boş olmadığı için seed onu **literal parola** olarak kabul eder — dosyayı
kopyalayıp değiştirmezseniz admin parolanız birebir `<CHANGE_ME_ADMIN_PASSWORD>` olur.
{% endhint %}

{% hint style="info" %}
- Admin seed devredeyken `Seed__DefaultAdminPassword` boş bırakılırsa uygulama açılışta
  `InvalidOperationException` ile durur.
- Değer sonradan değiştirilirse mevcut admin kullanıcısının parolası otomatik güncellenmez;
  DB'yi sıfırlamanız (`down -v`) veya parolayı uygulama üzerinden değiştirmeniz gerekir.
- Docker stack `ASPNETCORE_ENVIRONMENT=Test` ile çalışır
  (`infra/compose/docker-compose.test.yml`), yani **Development değildir**: admin ancak
  `Seed__EnableAdminSeed=true` ise seed edilir. Bu bayrak `.env.test` içindeki
  `SEED_ENABLE_ADMIN_SEED` değişkeninden gelir ve test stack'inde **varsayılanı `true`'dur**
  (`${SEED_ENABLE_ADMIN_SEED:-true}`). Prod stack'te varsayılan `false`'tur.
- Development dışı bir ortamda seed edilen admin `MustChangePassword` bayrağıyla oluşur:
  ilk girişte parola değiştirmeden API'yi kullanamazsınız
  (`MustChangePasswordMiddleware`).
{% endhint %}

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
| MinIO S3 API | `http://localhost:9002` |
| MSSQL | `localhost:1434` |

{% hint style="info" %}
`MINIO_PUBLIC_ENDPOINT` env değişkeni ortama göre farklı ayarlanır:

| Ortam | Değer |
|-------|-------|
| Local | `http://localhost:9002` |
| Test sunucu | `https://cargopilot.divizyon.org/media` |

Sunucuda nginx `/media/` path'i MinIO S3 API'ye (port 9002) reverse proxy yapılmıştır.
{% endhint %}

---

## 6. Geliştirme Akışı

```bash
# 1. Remote'u güncelle
git fetch origin

# 2. dev branch'inden yeni branch aç (branching kuralı)
git checkout -b feat/US-XXX-aciklama origin/dev

# 3. Geliştir, test et, commit at
git add <dosyalar>
git commit -m "kısa açıklayıcı mesaj"

# 4. Push et
git push origin feat/US-XXX-aciklama

# 5. dev'e PR aç
gh pr create --base dev
```

{% hint style="info" %}
Branch ve commit kuralları için bkz. [Branch Stratejisi](../conventions/branching.md) ve [Commit Kuralları](../conventions/commits.md).
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

{% hint style="warning" %}
**Backend artık eksik yapılandırmada sessizce başlamaz.** Faz 1 güvenlik sertleştirmesiyle
birlikte CORS ve JWT secret doğrulamaları fail-fast hale geldi: `.env.test` dosyasını
kopyalayıp `<CHANGE_ME_...>` alanlarını doldurmazsanız backend container'ı açılışta
exception fırlatıp çıkar. `docker ps` container'ı "Exited" gösterir; sebebi
`docker logs cargo-pilot-backend-test` çıktısında yazar.
{% endhint %}

<details>

<summary>Backend açılışta kapanıyor — <code>Cors:AllowedOrigins tanımlı değil</code></summary>

Docker stack `ASPNETCORE_ENVIRONMENT=Test` ile çalışır, yani **Development değildir**.
Development dışındaki her ortamda izin verilen origin listesi zorunludur; boşsa uygulama
`InvalidOperationException` ile durur.

Docker stack'te bu değer `.env.test` içindeki **`CORS_ALLOWED_ORIGIN_0`** değişkeninden
gelir; compose onu `Cors__AllowedOrigins__0` olarak container'a aktarır
(`docker-compose.test.yml:42`).

```bash
# infra/env/.env.test
CORS_ALLOWED_ORIGIN_0=http://localhost:3001
```

{% hint style="warning" %}
`.env.test.example` bu satırı sunucu domain'i (`https://cargopilot.divizyon.org`) ile
gönderir. Local'de Vite `http://localhost:3001` üzerinden çalıştığı için değeri kendi
origin'inizle değiştirin, aksi halde tarayıcıda CORS hatası alırsınız. Compose'daki
varsayılan boştur (`${CORS_ALLOWED_ORIGIN_0:-}`) — değişkeni tamamen silerseniz backend
**başlamaz**.
{% endhint %}

Değerin container'a ulaştığını doğrulayın:

```bash
docker exec cargo-pilot-backend-test env | grep Cors__
```

Compose kullanmadan (`dotnet run`) çalışıyorsanız anahtarı doğrudan yazın; liste
**indekslidir**, virgülle ayrılmış tek satır çalışmaz:

```bash
export Cors__AllowedOrigins__0=http://localhost:3001
```

</details>

<details>

<summary>Backend açılışta kapanıyor — <code>Jwt:Secret</code> doğrulama hatası</summary>

`Jwt:Secret` üç kurala birden uymalıdır, aksi halde `ValidateOnStart()` uygulamayı başlatmaz:

1. Boş olmamalı
2. **En az 32 karakter** olmalı
3. Bilinen bir şablon/placeholder metni **içermemeli** — `dev-only-secret`, `replace-with`,
   `replace_with`, `changeme`, `change-me`, `your-secret`, `secret-key-here`, `placeholder`,
   `sample-secret`

{% hint style="danger" %}
`appsettings.Development.json` içindeki hazır değer (`dev-only-secret-replace-with-...`)
bu listeye takılır. Container dışı `dotnet run` ile çalışırken de secret'ı gerçek bir
değerle değiştirmeniz gerekir.
{% endhint %}

Rastgele secret üretmek için:

```bash
openssl rand -base64 48
```

Docker stack'te değer `.env.test` içindeki **`JWT_SECRET`** değişkeninden gelir; compose
onu `Jwt__Secret` olarak aktarır (`docker-compose.test.yml:37`):

```bash
# infra/env/.env.test
JWT_SECRET=<üretilen 32+ karakterlik değer>
```

{% hint style="warning" %}
`.env.test.example` içindeki `<CHANGE_ME_JWT_SECRET_MIN_32_CHARS>` placeholder'ı 32
karakterden uzun olduğu ve placeholder listesindeki hiçbir metni birebir içermediği için
doğrulamayı **geçer**. Yani uygulama başlar ama secret'ınız repoda açıkça yazılı bir
değerdir — mutlaka değiştirin.
{% endhint %}

Ayrıntılı anahtar listesi: [Environment Variables](../../apps/backend/docs/environment-variables.md).

</details>

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

{% content-ref url="../conventions/branching.md" %}
[Branch Stratejisi](../conventions/branching.md)
{% endcontent-ref %}

{% content-ref url="../conventions/commits.md" %}
[Commit Kuralları](../conventions/commits.md)
{% endcontent-ref %}

{% content-ref url="../devops/secret-management.md" %}
[Secret Yönetimi](../devops/secret-management.md)
{% endcontent-ref %}

{% content-ref url="../devops/known-issues.md" %}
[Bilinen Sorunlar](../devops/known-issues.md)
{% endcontent-ref %}
