# ERP Aktarım Kontratı (plan → ERP sipariş yazımı)

**Kapsam:** ERP-18 · **Durum:** implementasyon hazır, özellik anahtarı **kapalı**
(`Erp:ExportEnabled = false`). Müşteri Netsis kurulumunda alanlar doğrulanmadan açılmaz.

## Ne yazılıyor

Onaylanan bir yükleme planı, Netsis standart sipariş tablolarına tek bir sipariş olarak yazılır:

| Hedef | İçerik |
|-------|--------|
| `TBLSIPAMAS` | Sipariş başlığı (1 satır) |
| `TBLSIPATRA` | Sipariş satırları (araca yerleşen her ürün için 1 satır) |

Satırların kaynağı plandaki **yerleşimlerdir** (`LoadingPlanPlacements`), giriş listesi değil:
araca yerleşemeyen ürün sevk edilmediği için siparişe girmez. Adet, o ürünün yerleşim
sayısıdır. Stok kodu `Item.ErpId`; ürün ERP'den gelmediyse `Item.SKU` kullanılır.

### TBLSIPAMAS'a yazılan kolonlar

`SUBE_KODU`, `FTIRSIP`, `FATIRS_NO`, `CARI_KODU`, `TARIH`, `SIRANO` (0), `ONAYTIPI` ('A'),
`ONAYNUM` (0), `ISLETME_KODU`, `KAPATILMIS` ('H'), `ACIKLAMA` (plan adı, 20 karaktere kırpılır),
`KAYITTARIHI`, `FATKALEM_ADEDI`, `TOPLAM_MIK`.

### TBLSIPATRA'ya yazılan kolonlar

`STOK_KODU`, `FISNO`, `STHAR_GCMIK`, `STHAR_GCKOD`, `STHAR_TARIH`, `STHAR_FTIRSIP`,
`STHAR_HTUR`, `DEPO_KODU`, `STHAR_CARIKOD`, `SIRA`, `SUBE_KODU`, `ONAYTIPI`, `ONAYNUM` (0),
`STHAR_ACIKLAMA` (SKU, 35 karaktere kırpılır).

`INCKEYNO` yazılmaz; kolonun ERP tarafında otomatik üretildiği (identity) varsayılır.
Müşteri şemasında değilse yazım hata verir ve bu doğrulama sırasında görülür.

## Yapılandırma (`appsettings` → `Erp`)

| Anahtar | Karşılığı | Varsayılan |
|---------|-----------|------------|
| `ExportEnabled` | Özellik anahtarı | `false` |
| `CustomerCode` | `CARI_KODU` | boş — **zorunlu**, boşken aktarım yapılmaz |
| `OrderNumberPrefix` | `FATIRS_NO` öneki | `CP` |
| `BranchCode` | `SUBE_KODU` | `0` |
| `BusinessCode` | `ISLETME_KODU` | `0` |
| `WarehouseCode` | `DEPO_KODU` | `0` |
| `DocumentType` | `FTIRSIP` / `STHAR_FTIRSIP` | `6` |
| `LineDirection` | `STHAR_GCKOD` | `C` |
| `LineMovementType` | `STHAR_HTUR` | `S` |

## Idempotency

Sipariş numarası plan kimliğinden deterministik üretilir: `{OrderNumberPrefix}-{planId[0..12]}`.
Yazım, serializable bir işlem içinde önce `TBLSIPAMAS.FATIRS_NO` varlığını kontrol eder;
kayıt varsa hiçbir satır yazılmaz ve aktarım "zaten mevcut" olarak başarılı sayılır.
Aynı planın ikinci aktarımı mükerrer sipariş üretmez.

## Hata sınıfları ve yeniden deneme

| Sınıf | Örnek | Davranış |
|-------|-------|----------|
| Kalıcı (`Validation`/`BusinessRule`) | ayar yok, cari kodu boş, sağlayıcı desteklenmiyor, yerleşim yok | Plan `Failed`, sync kaydına neden yazılır, **yeniden denenmez** |
| Geçici (`Unexpected`) | veritabanı/ağ hatası | Plan `Failed` + sync kaydı yazılır, ardından `ErpExportRetryableException` fırlatılır; Hangfire `AutomaticRetry(3)` devreye girer |

Hangfire'ın otomatik yeniden denemesi yalnızca exception'da tetiklendiği için, geçici hata
sonucu (Result.Failure) durum kaydedildikten sonra bilerek exception'a çevrilir.

## Kullanıcıya görünürlük

Aktarım sonucu plan detayında rozetle görünür: `Sent` → "ERP'ye aktarıldı", `Pending` →
"ERP aktarımı kuyrukta", `Failed` → "ERP'ye aktarılamadı" + nedeni (tooltip). Neden, planın
son aktarım denemesine ait sync kaydından (`SyncLog.ErrorMessage`) okunur ve plan detay
yanıtında `erpExportMessage` alanıyla döner.

Aktarım sync kayıtları (`SyncLog.LoadingPlanId` dolu) **ürün senkronizasyon geçmişinde
listelenmez**: o tablonun sayaçları (kaynak satır, eleme nedenleri) ürün çekimine özgüdür.
Filtre `ErpSyncPolicy.ProductSyncLog` ifadesindedir.

## Hedef entegrasyon seçimi

Şirkette **tam olarak bir** ERP bağlantısı olmalıdır. Bağlantı yoksa ya da birden fazlaysa
aktarım keyfi seçim yapmadan durur ve neden operasyon loglarına yazılır.

## Doğrulanması gereken açık noktalar (anahtar açılmadan önce)

- `FTIRSIP` / `STHAR_FTIRSIP` fiş tipi değeri müşterinin Netsis kurulumunda sipariş tipine karşılık geliyor mu?
- `KAPATILMIS` alanında 'H' değeri açık sipariş anlamına geliyor mu? (Netsis'te E/H = Evet/Hayır;
  `erp-schema-divizyon.md` bu alanı "'H' = kapalı" diye tanımlıyor ama örnek veri ve açık sipariş
  sorgusu tersini gösteriyor.)
- `INCKEYNO` identity mi, uygulama tarafından mı üretilmeli?
- Sipariş hangi cariye yazılacak: sabit tek cari mi, plan/müşteri başına mı? (Bugün tek sabit
  `Erp:CustomerCode`.)
- Yazma yetkili SQL hesabı: okuma için salt-okunur hesap öneriliyor; aktarım açıldığında
  bu iki tablo için yazma yetkisi gerekir (bkz. `adr-baglanti-mimarisi.md`).
