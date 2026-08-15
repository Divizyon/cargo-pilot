# Güvenlik Politikası

**Son güncelleme:** 2026-08-13 · **Durum:** Aktif

## Desteklenen Sürümler

Güvenlik güncellemeleri yalnızca `main` dalındaki son sürüme uygulanır. Önceki sürümler için
geriye dönük yama yayınlanmaz.

Sürüm şeması `v0.<minor>.0` biçimindedir; sürümler `test → main` terfisinde otomatik atılır.

| Sürüm | Destek |
|-------|--------|
| `main` dalındaki son sürüm | ✅ Destekleniyor |
| Daha eski sürümler | ❌ Desteklenmiyor |

## Açık Bildirimi

Güvenlik açıklarını **public issue açmadan** bildirin. Bildirim GitHub'ın özel açık raporlama
(private vulnerability reporting) kanalı üzerinden yapılır:

1. Repo → **Security** sekmesi → **Advisories**
2. **Report a vulnerability** düğmesi

Doğrudan bağlantı: <https://github.com/Divizyon/cargo-pilot/security/advisories/new>

Rapora şunları ekleyin: etkilenen bileşen, yeniden üretme adımları, etkinin kapsamı ve varsa
kavram kanıtı (PoC).

**Yanıt süresi:** Bildiriminize 72 saat içinde ilk dönüş yapılır.

## Kapsam

Bu repo Cargo Pilot'un şu kodunu içerir:

- **Frontend** — React / Vite / TypeScript
- **Backend** — .NET 8
- **Altyapı** — Docker, compose dosyaları, GitHub Actions workflow'ları

Test ortamı (`cargopilot.divizyon.org`) yalnızca gösterim amaçlıdır. Bu ortama yönelik **DoS veya
yük testi yapılmamalıdır**. Test ortamındaki verilerin üretim verisi olmadığını, ortamın her an
sıfırlanabileceğini not edin.

## Otomatik Taramalar

Repoda aşağıdaki taramalar etkindir:

| Tarama | Kapsam |
|--------|--------|
| Dependabot | npm, NuGet, Docker, GitHub Actions |
| CodeQL | C# ve TypeScript |
| Secret scanning | Push protection ile birlikte |

Bu taramaların ürettiği bulgular repo sahibi tarafından takip edilir; ayrıca bildirim
gerekmez.
