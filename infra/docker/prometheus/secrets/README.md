# Prometheus scrape token'ı

`/metrics` ve `/health/detail` uçları SEC-07 ile yetkilendirmeye bağlandı.
Prometheus bu uçları scrape edebilmek için bu dizinde **`metrics-token`** adlı
bir dosyaya ihtiyaç duyar.

Backend tarafında bu token, `MetricsAccess` politikasının kabul ettiği **dar
kapsamlı** bir kimlik bilgisidir: yalnızca `/metrics` ve `/health/detail`
uçlarını açar, başka hiçbir endpoint'e yetki vermez. SuperAdmin JWT'si ile
erişim de çalışmaya devam eder (insan operatör için).

## Kurulum

Token iki yere **aynı değerle** verilmelidir:

```bash
# 1) Token üret
TOKEN=$(openssl rand -base64 48)

# 2) Prometheus tarafı — dosya olarak
printf '%s' "$TOKEN" > infra/docker/prometheus/secrets/metrics-token
chmod 600 infra/docker/prometheus/secrets/metrics-token

# 3) Backend tarafı — .env dosyasına
echo "METRICS_SCRAPE_TOKEN=$TOKEN" >> infra/env/.env.prod   # veya .env.test
```

Compose, `.env`'deki `METRICS_SCRAPE_TOKEN` değerini backend'e
`Metrics__ScrapeToken` olarak geçirir.

Token dosyası `.gitignore` ile dışarıda tutulur; **repoya commit edilmemelidir.**

## Kurallar

- En az **32 karakter** olmalıdır.
- Şablon/placeholder değerler (`<CHANGE_ME_...>`, `changeme`, `placeholder` vb.)
  reddedilir ve **uygulama başlamaz** — sessiz zayıf-token durumu oluşamaz.
- Süresi dolmaz: JWT değil, opak bir paylaşılan sırdır. Rotasyon manuel yapılır
  (yeni token üret → iki yeri birlikte güncelle → backend'i yeniden başlat).

## Davranış

| Durum | Sonuç |
|-------|-------|
| `METRICS_SCRAPE_TOKEN` boş, dosya yok | Scrape yolu kapalı; yalnızca SuperAdmin JWT'si geçerli. Prometheus normal başlar, yalnızca `cargo-pilot-backend-*` job'u `down` olur (`unable to read authorization credentials file`). `node-exporter` ve `cadvisor` etkilenmez. |
| İki taraf aynı token | Job `up`; `Authorization: Bearer <token>` gönderilir, 200 döner. |
| Token'lar uyuşmuyor | Backend 401 döner, job `down`. |
| Token 32 karakterden kısa veya placeholder | **Backend başlamaz** (`Metrics:ScrapeToken` doğrulama hatası). |

## İlgili alarm

`alert-rules.yml`'deki `up{job="cargo-pilot-backend-*"}` kuralı, token
yapılandırılmadığı sürece backend ayaktayken de tetiklenir. Token kurulumu
tamamlanmadan bu alarmın yanlış pozitif ürettiğini unutmayın.
