# ADR-0001 — ERP Bağlantı Mimarisi

- **Durum:** Kabul edildi
- **Tarih:** 2026-08-11
- **Kapsam:** ERP-17, ERP-21, ERP-22, ERP-23 · **Ön koşuludur:** ERP-18 (geri yazım)

## Bağlam

Cargo Pilot müşteri ERP'sinden (Netsis, ileride Logo) ürün verisi okuyor. Bugünkü
gerçekleştirim, müşterinin MSSQL sunucusuna doğrudan `Microsoft.Data.SqlClient` ile
bağlanıp stok master tablosunu (Netsis: `TBLSTSABIT`) sorguluyor. Netsis'in resmî
NetOpenX/REST arayüzü ve Logo'nun LogoObjects/REST arayüzü kullanılmıyor.

Bu tercih bugüne kadar hiçbir yerde yazılı değildi; ağ ön koşulları, hesap yetki
gereksinimi ve geri yazımın hangi yoldan yapılacağı belirsizdi.

## Karar

### 1. MVP'de doğrudan MSSQL okuma

Ürün senkronizasyonu müşteri veritabanına doğrudan `SELECT` ile yapılır.

Gerekçe:

- Netsis NetOpenX ve Logo REST kurulumu müşteri tarafında ek lisans, servis kurulumu ve
  sürüm uyumu gerektiriyor; pilot müşteride bu ön koşulların hiçbiri hazır değil.
- Okuma tarafı şema riski sınırlı: stok master tabloları sürümler arasında büyük ölçüde
  sabit ve sorgu tek tablo üzerinde.
- Bağlantı testi artık şema doğrulaması yapıyor (ERP-21), yani yanlış veritabanına
  bağlanma sessizce başarılı görünmüyor.

Sonuçları:

- Her sağlayıcı için ayrı fetcher gerekir (`IErpProductFetcher`); fetcher'ı olmayan
  sağlayıcıda sync açık hata verir, asla yanlış şemayı sorgulamaz.
- Netsis dışı sağlayıcılarda (Logo) şema dokümanı gelene kadar senkronizasyon kapalıdır.

### 2. Geri yazım (ERP-18) doğrudan tabloya YAZMAZ

Sipariş/plan geri yazımı müşteri tablolarına doğrudan `INSERT`/`UPDATE` ile yapılmaz.

Gerekçe:

- Netsis sipariş tabloları (`TBLSIPAMAS`/`TBLSIPATRA`) arasında uygulama seviyesinde
  tutulan tutarlılık kuralları var; doğrudan yazım müşteri verisini bozabilir ve destek
  sorumluluğunu Cargo Pilot'a taşır.
- Okumanın aksine yazımda hata geri alınamaz.

Sonuçları:

- ERP-18 kapsamındaki export, feature-flag arkasında **varsayılan kapalı** geliştirilir ve
  ancak müşteri şeması + yazım yöntemi (tercihen resmî API veya müşterinin onayladığı
  ara tablo) doğrulandıktan sonra açılır.
- Bağlantı hesabı salt-okunur kaldığı sürece geri yazım zaten fiziksel olarak mümkün
  değildir; bu bilinçli bir güvenlik kilididir.

### 3. Resmî API'ler bilinçli olarak ertelendi

Netsis NetOpenX ve Logo REST/LogoObjects entegrasyonu ertelenmiştir. Şu koşullardan biri
oluştuğunda yeniden değerlendirilir:

- Geri yazım (ERP-18) üretimde açılacaksa,
- Stok dışı veri (sipariş, cari, depo hareketi) gerekiyorsa,
- Müşteri doğrudan DB erişimine izin vermiyorsa.

### 4. Bağlantı yalnızca salt-okunur hesapla kurulur

Kurulumda müşteri, yalnızca `db_datareader` yetkisi olan ayrı bir SQL login'i açar.
`sa` veya uygulama hesabı kullanılmaz. Bağlantı testi hesabın yazma yetkisi olduğunu
tespit ederse kullanıcıya görünür uyarı döner (test başarısız sayılmaz, uyarı gösterilir).

## Ağ ön koşulları

Cargo Pilot backend'i bulutta, müşteri ERP veritabanı müşteri ağındadır. Bağlantı
bulut → müşteri yönünde kurulur:

| Gereksinim | Değer |
|---|---|
| Protokol/port | TCP 1433 (named instance kullanılıyorsa sabit port'a alınmalı) |
| Yön | Cargo Pilot backend çıkışı → müşteri SQL sunucusu |
| Erişim modeli | Site-to-site VPN **veya** müşteri güvenlik duvarında Cargo Pilot çıkış IP'sine allowlist |
| Şifreleme | `Encrypt=true` her zaman açık |
| Sertifika | Geçerli sertifika varsa "Sertifika doğrulamasını atla" ayarı **kapalı** tutulur; self-signed sertifikada açık bırakılır (ErpSettings.TrustServerCertificate) |
| Zaman aşımı | Bağlantı 15 sn, sorgu 120 sn |

Doğrudan internete açık 1433 portu kabul edilebilir bir kurulum değildir; VPN veya
IP allowlist zorunludur.

## Önerilen SQL login şablonu

```sql
-- 1) Login (sunucu seviyesi)
CREATE LOGIN cargopilot_ro WITH PASSWORD = '<güçlü-parola>', CHECK_POLICY = ON;

-- 2) Yalnızca ERP veritabanında kullanıcı ve salt-okunur rol
USE [MUSTERI_ERP_DB];
CREATE USER cargopilot_ro FOR LOGIN cargopilot_ro;
ALTER ROLE db_datareader ADD MEMBER cargopilot_ro;

-- 3) Yazma yetkisi verilmez; aşağıdakiler bilinçli olarak YOKTUR
-- ALTER ROLE db_datawriter ADD MEMBER cargopilot_ro;  -- kullanılmaz
-- ALTER ROLE db_owner     ADD MEMBER cargopilot_ro;  -- kullanılmaz
```

İsteğe bağlı sıkılaştırma: `db_datareader` yerine yalnızca gereken tablolara
`GRANT SELECT ON dbo.TBLSTSABIT TO cargopilot_ro;` verilebilir.

## Kimlik bilgisi saklama

- Parola `ErpSettings.PasswordEncrypted` alanında, `IDataProtectionProvider` üzerinden
  şifreli saklanır (`IErpPasswordProtector`).
- `ErpSettings` bu bilginin tek kaynağıdır (SSOT). `Integration.AuthCredentials` düz metin
  alanı hiç kullanılmıyordu ve ERP-23 kapsamında şemadan kaldırıldı.
- Katmanlar arasında parola düz JSON string ile değil, `ErpCredentials` tipiyle taşınır;
  tipin `ToString`'i parolayı maskeler, böylece log ve exception mesajlarına sızmaz.
- Kayıtlı parola çözülemezse (anahtar halkası değişmiş ya da kayıt bozulmuşsa) sunucuya
  bozuk kimlik bilgisiyle bağlanılmaz; kullanıcıya "ERP kimlik bilgileri okunamadı,
  parolayı yeniden kaydedin" hatası döner.

## Alternatifler

| Alternatif | Neden seçilmedi |
|---|---|
| Netsis NetOpenX / Logo REST | Müşteri tarafında kurulum, lisans ve sürüm ön koşulları MVP takvimine sığmıyor |
| Müşteri ağında agent/connector servisi | Kurulum ve güncelleme maliyeti; pilot için aşırı |
| Dosya tabanlı aktarım (CSV/Excel drop) | Zaten manuel içe aktarma olarak var; canlı senkronizasyon ihtiyacını karşılamıyor |

## Açık konular

- Logo şema dokümanı gelmeden Logo fetcher'ı yazılmayacak; Logo seçili entegrasyonda sync
  açık hata döner.
- ERP-18'de kullanılacak resmî API/ara tablo yöntemi müşteri şeması doğrulandıktan sonra
  bu ADR'ye ek karar olarak işlenecek.
