# E2E — Playwright

ERP zincirinin uçtan uca doğrulaması. Koşucu kendi sunucusunu ayağa kaldırmaz;
`infra/compose/docker-compose.test.yml` ile kurulan test ortamına karşı çalışır.

## Ortamı hazırla (repo kökünden)

```bash
# 1) Stack + sahte ERP MSSQL
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test --profile e2e up -d --wait --wait-timeout 420

# 2) Sahte Netsis verisini yükle (TBLSTSABIT)
docker compose -f infra/compose/docker-compose.test.yml \
  --env-file infra/env/.env.test run --rm erp-mssql-init
```

`erp-mssql` ve `erp-mssql-init` servisleri profil arkasındadır; `--profile e2e`
verilmediğinde ayağa kalkmaz, dolayısıyla test sunucusundaki stack'i etkilemez.

## Testleri koş

```bash
cd apps/frontend
npm run test:e2e          # tüm senaryolar
npm run test:e2e:ui       # etkileşimli koşucu
```

## Ortam değişkenleri

| Değişken            | Varsayılan             | Açıklama                                        |
| ------------------- | ---------------------- | ----------------------------------------------- |
| `E2E_BASE_URL`      | `http://localhost:3001`| Frontend adresi                                 |
| `E2E_ADMIN_EMAIL`   | `admin@cargopilot.com` | Seed edilen şirket yöneticisi                   |
| `E2E_ADMIN_PASSWORD`| `Admin@CargoPilot1!`   | `Seed__DefaultAdminPassword` ile aynı olmalı     |
| `E2E_ERP_SERVER`    | `erp-mssql,1433`       | Backend konteynerinden görülen ERP adresi        |
| `E2E_ERP_DATABASE`  | `ERPTEST`              | Sahte ERP veritabanı adı                        |
| `E2E_ERP_USER`      | `sa`                   | Sahte ERP kullanıcısı                           |
| `E2E_ERP_PASSWORD`  | `ErpFake_Pass123!`     | `ERP_MSSQL_SA_PASSWORD` ile aynı olmalı          |

## Kapsam

- `erp-sync-smoke.spec.ts` — giriş → bağlantı ayarı → çekim → taslak listesi (ERP-03 kabul kriteri).
- `erp-canli-senaryolar.spec.ts` — planın 12. bölüm 11. maddesindeki altı canlı senaryo.

Senaryolar tek şirketin ERP ayarını paylaştığı için koşum seri (`workers: 1`) yapılır.
Her senaryo kendi bağlantı durumunu baştan kurar.
