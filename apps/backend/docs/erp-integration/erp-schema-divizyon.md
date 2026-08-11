# ERP Veritabanı Şeması — DIVIZYON

> **Bu bir Netsis şemasıdır.** Buradaki tablo/kolon adları yalnızca Netsis sağlayıcısı
> için geçerlidir ve `NetsisProductFetcher` bu şemayı sorgular. Logo sağlayıcısının
> şeması farklıdır (`LG_` önekli tablolar); Logo şema dokümanı gelene kadar Logo
> entegrasyonunda ürün senkronizasyonu açık hata döndürür, Netsis SQL'i çalıştırılmaz.
>
> Veritabanı adı müşteriye göre değişir; `DIVIZYON` yalnızca bu örnek yedeğin adıdır ve
> kodda varsayılan olarak kullanılmaz — ERP ayarlarındaki "Veritabanı Adı" alanı esastır.
> Bağlantı için salt-okunur (`db_datareader`) bir SQL login'i önerilir; ağ ön koşulları ve
> login şablonu için [adr-baglanti-mimarisi.md](./adr-baglanti-mimarisi.md).

Kaynak: `DIVIZYON.bak` (SQL Server 2019, 4.35 MB)  
Restore: `erp-schema-inspect` Docker container, port 1435  
Tablo sayısı: 3 | `TBLSTSABIT` (134 kol), `TBLSIPAMAS` (106 kol), `TBLSIPATRA` (97 kol)

`CP Mapping` sütununda değer olan satırlar Cargo Pilot entegrasyonunda kullanılır.

---

## TBLSTSABIT — Stok / Ürün Master

Cargo Pilot `Item` sync'inin kaynağı.

| # | Kolon | Tip | Zorunlu | CP Mapping | Açıklama |
|---|-------|-----|---------|------------|----------|
| 1 | `SUBE_KODU` | int | YES | — | Şube kodu |
| 2 | `ISLETME_KODU` | int | YES | — | İşletme kodu |
| 3 | `STOK_KODU` | varchar(100) | YES | `Item.ErpId` | Benzersiz ürün kodu |
| 4 | `URETICI_KODU` | varchar(100) | NO | — | Üretici kodu |
| 5 | `STOK_ADI` | varchar(200) | NO | `Item.Name` | Ürün adı |
| 6 | `GRUP_KODU` | varchar(100) | NO | — | Ürün grubu |
| 7 | `KOD_1` | varchar(100) | NO | — | Yedek kod 1 |
| 8 | `KOD_2` | varchar(100) | NO | — | Yedek kod 2 |
| 9 | `KOD_3` | varchar(100) | NO | — | Yedek kod 3 |
| 10 | `KOD_4` | varchar(100) | NO | — | Yedek kod 4 |
| 11 | `KOD_5` | varchar(100) | NO | — | Yedek kod 5 |
| 12 | `SATICI_KODU` | varchar(100) | NO | — | Satıcı kodu |
| 13 | `OLCU_BR1` | varchar(2) | NO | — | Ölçü birimi 1 |
| 14 | `OLCU_BR2` | varchar(2) | NO | — | Ölçü birimi 2 |
| 15 | `PAY_1` | decimal | NO | — | Birim dönüşüm pay |
| 16 | `PAYDA_1` | decimal | NO | — | Birim dönüşüm payda |
| 17 | `OLCU_BR3` | varchar(2) | NO | — | Ölçü birimi 3 |
| 18 | `PAY2` | decimal | NO | — | Birim dönüşüm pay 2 |
| 19 | `PAYDA2` | decimal | NO | — | Birim dönüşüm payda 2 |
| 20 | `FIAT_BIRIMI` | char(1) | NO | — | Fiyat birimi |
| 21 | `AZAMI_STOK` | decimal | NO | — | Azami stok miktarı |
| 22 | `ASGARI_STOK` | decimal | NO | — | Asgari stok miktarı |
| 23 | `TEMIN_SURESI` | decimal | NO | — | Temin süresi |
| 24 | `KUL_MIK` | decimal | NO | — | Kullanım miktarı |
| 25 | `RISK_SURESI` | int | NO | — | Risk süresi |
| 26 | `ZAMAN_BIRIMI` | varchar(3) | NO | — | Zaman birimi |
| 27 | `SATIS_FIAT1` | decimal | NO | — | Satış fiyatı 1 |
| 28 | `SATIS_FIAT2` | decimal | NO | — | Satış fiyatı 2 |
| 29 | `SATIS_FIAT3` | decimal | NO | — | Satış fiyatı 3 |
| 30 | `SATIS_FIAT4` | decimal | NO | — | Satış fiyatı 4 |
| 31 | `SAT_DOV_TIP` | tinyint | NO | — | Satış döviz tipi |
| 32 | `DOV_ALIS_FIAT` | decimal | NO | — | Döviz alış fiyatı |
| 33 | `DOV_MAL_FIAT` | decimal | NO | — | Döviz maliyet fiyatı |
| 34 | `DOV_SATIS_FIAT` | decimal | NO | — | Döviz satış fiyatı |
| 35 | `MUH_DETAYKODU` | int | NO | — | Muhasebe detay kodu |
| 36 | `BIRIM_AGIRLIK` | decimal | NO | `Item.WeightKg` | Birim ağırlık (kg) |
| 37 | `NAKLIYET_TUT` | decimal | NO | — | Nakliye tutarı |
| 38 | `KDV_ORANI` | int | NO | — | KDV oranı |
| 39 | `ALIS_DOV_TIP` | tinyint | NO | — | Alış döviz tipi |
| 40 | `DEPO_KODU` | int | NO | — | Depo kodu |
| 41 | `DOV_TUR` | tinyint | NO | — | Döviz türü |
| 42 | `URET_OLCU_BR` | tinyint | NO | — | Üretim ölçü birimi |
| 43 | `BILESENMI` | char(1) | NO | — | Bileşen mi? |
| 44 | `MAMULMU` | char(1) | NO | — | Mamul mü? |
| 45 | `FORMUL_TOPLAMI` | decimal | NO | — | Formül toplamı |
| 46 | `UPDATE_KODU` | char(1) | NO | — | Güncelleme kodu |
| 47 | `MAX_ISKONTO` | decimal | NO | — | Maksimum iskonto |
| 48 | `ECZACI_KARI` | decimal | NO | — | Eczacı karı |
| 49 | `MIKTAR` | decimal | NO | — | Miktar |
| 50 | `MAL_FAZLASI` | decimal | NO | — | Mal fazlası |
| 51 | `KDV_TENZIL_ORAN` | decimal | NO | — | KDV tenzil oranı |
| 52 | `KILIT` | char(1) | NO | — | Kilit durumu |
| 53 | `ONCEKI_KOD` | varchar(100) | NO | — | Önceki kod |
| 54 | `SONRAKI_KOD` | varchar(100) | NO | — | Sonraki kod |
| 55 | `BARKOD1` | varchar(35) | NO | — | Barkod 1 |
| 56 | `BARKOD2` | varchar(35) | NO | — | Barkod 2 |
| 57 | `BARKOD3` | varchar(35) | NO | — | Barkod 3 |
| 58 | `ALIS_KDV_KODU` | int | NO | — | Alış KDV kodu |
| 59 | `ALIS_FIAT1` | decimal | NO | — | Alış fiyatı 1 |
| 60 | `ALIS_FIAT2` | decimal | NO | — | Alış fiyatı 2 |
| 61 | `ALIS_FIAT3` | decimal | NO | — | Alış fiyatı 3 |
| 62 | `ALIS_FIAT4` | decimal | NO | — | Alış fiyatı 4 |
| 63 | `LOT_SIZE` | decimal | NO | — | Lot büyüklüğü |
| 64 | `MIN_SIP_MIKTAR` | decimal | NO | — | Minimum sipariş miktarı |
| 65 | `SABIT_SIP_ARALIK` | int | NO | — | Sabit sipariş aralığı |
| 66 | `SIP_POLITIKASI` | char(1) | NO | — | Sipariş politikası |
| 67 | `OZELLIK_KODU1` | tinyint | NO | — | Özellik kodu 1 |
| 68 | `OZELLIK_KODU2` | tinyint | NO | — | Özellik kodu 2 |
| 69 | `OZELLIK_KODU3` | tinyint | NO | — | Özellik kodu 3 |
| 70 | `OZELLIK_KODU4` | tinyint | NO | — | Özellik kodu 4 |
| 71 | `OZELLIK_KODU5` | tinyint | NO | — | Özellik kodu 5 |
| 72 | `OPSIYON_KODU1` | tinyint | NO | — | Opsiyon kodu 1 |
| 73 | `OPSIYON_KODU2` | tinyint | NO | — | Opsiyon kodu 2 |
| 74 | `OPSIYON_KODU3` | tinyint | NO | — | Opsiyon kodu 3 |
| 75 | `OPSIYON_KODU4` | tinyint | NO | — | Opsiyon kodu 4 |
| 76 | `OPSIYON_KODU5` | tinyint | NO | — | Opsiyon kodu 5 |
| 77 | `BILESEN_OP_KODU` | tinyint | NO | — | Bileşen opsiyon kodu |
| 78 | `SIP_VER_MAL` | decimal | NO | — | Sipariş verilmiş mal |
| 79 | `ELDE_BUL_MAL` | decimal | NO | — | Elde bulunan mal |
| 80 | `YIL_TAH_KUL_MIK` | decimal | NO | — | Yıllık tahmini kullanım miktarı |
| 81 | `EKON_SIP_MIKTAR` | decimal | NO | — | Ekonomik sipariş miktarı |
| 82 | `ESKI_RECETE` | char(1) | NO | — | Eski reçete |
| 83 | `OTOMATIK_URETIM` | char(1) | NO | — | Otomatik üretim |
| 84 | `ALFKOD` | char(1) | NO | — | Alfa kod |
| 85 | `SAFKOD` | char(1) | NO | — | Saf kod |
| 86 | `KODTURU` | char(1) | NO | — | Kod türü |
| 87 | `S_YEDEK1` | varchar(15) | NO | — | Yedek string 1 |
| 88 | `S_YEDEK2` | varchar(15) | NO | — | Yedek string 2 |
| 89 | `F_YEDEK3` | decimal | NO | — | Yedek decimal 3 |
| 90 | `F_YEDEK4` | decimal | NO | — | Yedek decimal 4 |
| 91 | `C_YEDEK5` | char(1) | NO | — | Yedek char 5 |
| 92 | `C_YEDEK6` | char(1) | NO | — | Yedek char 6 |
| 93 | `B_YEDEK7` | tinyint | NO | — | Yedek byte 7 |
| 94 | `I_YEDEK8` | int | NO | — | Yedek int 8 |
| 95 | `L_YEDEK9` | int | NO | — | Yedek int 9 |
| 96 | `D_YEDEK10` | datetime | NO | — | Yedek datetime 10 |
| 97 | `GIRIS_SERI` | char(1) | NO | — | Giriş seri |
| 98 | `CIKIS_SERI` | char(1) | NO | — | Çıkış seri |
| 99 | `SERI_BAK` | char(1) | NO | — | Seri bakım |
| 100 | `SERI_MIK` | char(1) | NO | — | Seri miktar |
| 101 | `SERI_GIR_OT` | char(1) | NO | — | Seri giriş otomatik |
| 102 | `SERI_CIK_OT` | char(1) | NO | — | Seri çıkış otomatik |
| 103 | `SERI_BASLANGIC` | varchar(35) | NO | — | Seri başlangıç |
| 104 | `FIYATKODU` | varchar(35) | NO | — | Fiyat kodu |
| 105 | `FIYATSIRASI` | int | NO | — | Fiyat sırası |
| 106 | `PLANLANACAK` | char(1) | NO | — | Planlanacak mı? |
| 107 | `LOT_SIZECUSTOMER` | decimal | NO | — | Müşteri lot büyüklüğü |
| 108 | `MIN_SIP_MIKTARCUSTOMER` | decimal | NO | — | Müşteri min sipariş miktarı |
| 109 | `GUMRUKTARIFEKODU` | varchar(35) | NO | — | Gümrük tarife kodu |
| 110 | `ABCKODU` | varchar(8) | NO | — | ABC analiz kodu |
| 111 | `PERFORMANSKODU` | varchar(4) | NO | — | Performans kodu |
| 112 | `SATICISIPKILIT` | char(1) | NO | — | Satıcı sipariş kilidi |
| 113 | `MUSTERISIPKILIT` | char(1) | NO | — | Müşteri sipariş kilidi |
| 114 | `SATINALMAKILIT` | char(1) | NO | — | Satın alma kilidi |
| 115 | `SATISKILIT` | char(1) | NO | — | Satış kilidi. `'E'` = satışa kapalı |
| 116 | `EN` | decimal | NO | `Item.Width` | Genişlik (cm) |
| 117 | `BOY` | decimal | NO | `Item.Depth` | Derinlik / kutu kalınlığı (cm) |
| 118 | `GENISLIK` | decimal | NO | `Item.Height` | Yükseklik (cm) |
| 119 | `SIPLIMITVAR` | char(1) | NO | — | Sipariş limiti var mı? |
| 120 | `SONSTOKKODU` | varchar(100) | NO | — | Son stok kodu |
| 121 | `ONAYTIPI` | char(1) | NO | — | Onay tipi |
| 122 | `ONAYNUM` | int | NO | — | Onay numarası |
| 123 | `FIKTIF_MAM` | char(1) | NO | — | Fiktif mamul |
| 124 | `YAPILANDIR` | char(1) | NO | — | Yapılandırılabilir |
| 125 | `SBOMVARMI` | char(1) | NO | — | S-BOM var mı? |
| 126 | `BAGLISTOKKOD` | varchar(100) | NO | — | Bağlı stok kodu |
| 127 | `YAPKOD` | varchar(15) | NO | — | Yapı kodu |
| 128 | `ALISTALTEKKILIT` | char(1) | NO | — | Alış alt tek kilidi |
| 129 | `SATISTALTEKKILIT` | char(1) | NO | — | Satış alt tek kilidi |
| 130 | `S_YEDEK3` | varchar(50) | NO | — | Yedek string 3 |
| 131 | `STOKMEVZUAT` | int | NO | — | Stok mevzuat |
| 132 | `OTVTEVKIFAT` | char(1) | NO | — | OTV tevkifat |
| 133 | `SERIBARKOD` | char(1) | NO | — | Seri barkod |
| 134 | `ATIK_URUN` | char(1) | NO | — | Atık ürün |

### Boyut Birimi

Örnek (31" LED TV): `EN=83, BOY=16, GENISLIK=52` → hepsi cm cinsinden.  
Cargo Pilot scene birimi de cm, dönüşüm gerekmez.

| ERP | CP Alanı | Örnek |
|-----|----------|-------|
| `EN` | `Item.Width` | 83 cm |
| `BOY` | `Item.Depth` | 16 cm |
| `GENISLIK` | `Item.Height` | 52 cm |

### Sync Sorgusu

```sql
SELECT STOK_KODU, STOK_ADI, BIRIM_AGIRLIK, EN, BOY, GENISLIK
FROM TBLSTSABIT
WHERE SATISKILIT IS NULL OR SATISKILIT != 'E'
```

### Ürün sync'inde delta yok — tam tarama ve satır limiti

Sipariş tablolarının aksine `TBLSTSABIT`'te delta sorgusuna dayanak olacak bir değişiklik
damgası (`KAYITTARIHI` / `DUZELTMETARIHI` karşılığı) yoktur; tablodaki datetime kolonları
yedek alanlardır ve müşteri kurulumunda doldurulacağı garanti değildir. Bu yüzden ürün sync'i
her çalışmada tam tarama yapar. Maliyet iki yerden sınırlanır:

- Sorgu `SELECT TOP (@MaxRowCount)` ile çalışır (`NetsisProductFetcher.MaxRowCount` = 20.000).
  Limit dolarsa uyarı loglanır, alınmayan satırlar mutabakat kırılımında görünür ve bir sonraki
  çalışmaya kalır.
- Zamanlanmış sync (`ErpScheduledSyncJob`) 15 dakikada bir tarar ama yalnızca vadesi gelen
  entegrasyonları çalıştırır; şirket başına eşzamanlı tek sync kuralı korunur.

Müşteri şemasında güvenilir bir güncelleme damgası doğrulanırsa delta sorgusu buraya eklenir ve
tam tarama yalnızca ilk yüklemede kullanılır.

---

## TBLSIPAMAS — Sipariş Başlığı

| # | Kolon | Tip | Zorunlu | CP Mapping | Açıklama |
|---|-------|-----|---------|------------|----------|
| 1 | `SUBE_KODU` | int | YES | — | Şube kodu |
| 2 | `FTIRSIP` | char(1) | YES | — | Fatura/irsaliye/sipariş tipi |
| 3 | `FATIRS_NO` | varchar(300) | YES | Sipariş ref key | Sipariş numarası. Örn: `SIP-2026-0001` |
| 4 | `CARI_KODU` | varchar(300) | YES | — | Müşteri kodu. Örn: `120-001` |
| 5 | `TARIH` | datetime | YES | Sipariş tarihi | |
| 6 | `TIPI` | tinyint | NO | — | Sipariş tipi |
| 7 | `BRUTTUTAR` | decimal | NO | — | Brüt tutar |
| 8 | `SAT_ISKT` | decimal | NO | — | Satır iskontosu toplamı |
| 9 | `MFAZ_ISKT` | decimal | NO | — | Mal fazlası iskontosu |
| 10 | `GEN_ISK1T` | decimal | NO | — | Genel iskonto 1 tutarı |
| 11 | `GEN_ISK2T` | decimal | NO | — | Genel iskonto 2 tutarı |
| 12 | `GEN_ISK3T` | decimal | NO | — | Genel iskonto 3 tutarı |
| 13 | `GEN_ISK1O` | decimal | NO | — | Genel iskonto 1 oranı |
| 14 | `GEN_ISK2O` | decimal | NO | — | Genel iskonto 2 oranı |
| 15 | `GEN_ISK3O` | decimal | NO | — | Genel iskonto 3 oranı |
| 16 | `KDV` | decimal | NO | — | KDV tutarı |
| 17 | `FAT_ALTM1` | decimal | NO | — | Fatura alt metni 1 |
| 18 | `FAT_ALTM2` | decimal | NO | — | Fatura alt metni 2 |
| 19 | `ACIKLAMA` | varchar(20) | NO | — | Açıklama |
| 20 | `KOD1` | char(1) | NO | — | Kod 1 |
| 21 | `KOD2` | char(1) | NO | — | Kod 2 |
| 22 | `ODEMEGUNU` | int | NO | — | Ödeme günü |
| 23 | `ODEMETARIHI` | datetime | NO | — | Ödeme tarihi |
| 24 | `KDV_DAHILMI` | char(1) | NO | — | KDV dahil mi? |
| 25 | `FATKALEM_ADEDI` | int | NO | — | Fatura kalem adedi |
| 26 | `SIPARIS_TEST` | datetime | NO | — | Sipariş test tarihi |
| 27 | `TOPLAM_MIK` | decimal | NO | — | Toplam miktar |
| 28 | `TOPDEPO` | int | NO | — | Toplam depo |
| 29 | `YEDEK22` | varchar(2) | NO | — | Yedek |
| 30 | `CARI_KOD2` | varchar(300) | NO | — | Cari kod 2 |
| 31 | `YEDEK` | char(1) | NO | — | Yedek |
| 32 | `UPDATE_KODU` | char(1) | NO | — | Güncelleme kodu |
| 33 | `SIRANO` | int | YES | — | Sıra no (alternatif key) |
| 34 | `KDV_DAHIL_BRUT_TOP` | decimal | NO | — | KDV dahil brüt toplam |
| 35 | `KDV_TENZIL` | decimal | NO | — | KDV tenzili |
| 36 | `MALFAZLASIKDVSI` | decimal | NO | — | Mal fazlası KDV'si |
| 37 | `GENELTOPLAM` | decimal | NO | — | Genel toplam |
| 38 | `YUVARLAMA` | decimal | NO | — | Yuvarlama farkı |
| 39 | `SATIS_KOND` | varchar(4) | NO | — | Satış kondisyonu |
| 40 | `PLA_KODU` | varchar(8) | NO | — | Plasiyer kodu |
| 41 | `DOVIZTIP` | tinyint | NO | — | Döviz tipi |
| 42 | `DOVIZTUT` | decimal | NO | — | Döviz tutarı |
| 43 | `KS_KODU` | varchar(8) | NO | — | KS kodu |
| 44 | `BAG_TUTAR` | decimal | NO | — | Bağlantı tutarı |
| 45 | `YEDEK2` | varchar(7) | NO | — | Yedek 2 |
| 46 | `HIZMET_FAT` | char(1) | NO | — | Hizmet faturası mı? |
| 47 | `VADEBAZT` | datetime | NO | — | Vade baz tarihi |
| 48 | `KAPATILMIS` | char(1) | NO | — | `'H'` = kapalı. NULL/boş = açık sipariş |
| 49 | `S_YEDEK1` | varchar(300) | NO | — | Yedek string 1 |
| 50 | `S_YEDEK2` | varchar(8) | NO | — | Yedek string 2 |
| 51 | `F_YEDEK3` | decimal | NO | — | Yedek decimal 3 |
| 52 | `F_YEDEK4` | decimal | NO | — | Yedek decimal 4 |
| 53 | `F_YEDEK5` | decimal | NO | — | Yedek decimal 5 |
| 54 | `C_YEDEK6` | char(1) | NO | — | Yedek char 6 |
| 55 | `B_YEDEK7` | tinyint | NO | — | Yedek byte 7 |
| 56 | `I_YEDEK8` | int | NO | — | Yedek int 8 |
| 57 | `L_YEDEK9` | int | NO | — | Yedek int 9 |
| 58 | `AMBAR_KBLNO` | varchar(15) | NO | — | Ambar kabul numarası |
| 59 | `D_YEDEK10` | datetime | NO | — | Yedek datetime 10 |
| 60 | `PROJE_KODU` | varchar(200) | NO | — | Proje kodu |
| 61 | `KOSULKODU` | varchar(8) | NO | — | Koşul kodu |
| 62 | `FIYATTARIHI` | datetime | NO | — | Fiyat tarihi |
| 63 | `KOSULTARIHI` | datetime | NO | — | Koşul tarihi |
| 64 | `GENISK1TIP` | int | NO | — | Genel iskonto 1 tipi |
| 65 | `GENISK2TIP` | int | NO | — | Genel iskonto 2 tipi |
| 66 | `GENISK3TIP` | int | NO | — | Genel iskonto 3 tipi |
| 67 | `EXPORTTYPE` | tinyint | NO | — | İhracat tipi |
| 68 | `EXGUMRUKNO` | varchar(20) | NO | — | İhracat gümrük numarası |
| 69 | `EXGUMTARIH` | datetime | NO | — | İhracat gümrük tarihi |
| 70 | `EXFIILITARIH` | datetime | NO | — | İhracat fiili tarihi |
| 71 | `EXPORTREFNO` | varchar(20) | NO | — | İhracat referans numarası |
| 72 | `KAYITYAPANKUL` | int | NO | `ErpUserMapping.ErpUserId` | Siparişi oluşturan ERP kullanıcı ID'si |
| 73 | `KAYITTARIHI` | datetime | NO | Delta sync | Kayıt tarihi |
| 74 | `DUZELTMEYAPANKUL` | int | NO | — | Son güncelleyen ERP kullanıcı ID'si |
| 75 | `DUZELTMETARIHI` | datetime | NO | Delta sync | Son güncelleme tarihi |
| 76 | `GELSUBE_KODU` | int | NO | — | Gelen şube kodu |
| 77 | `GITSUBE_KODU` | int | NO | — | Giden şube kodu |
| 78 | `ONAYTIPI` | char(1) | YES | — | Onay tipi |
| 79 | `ONAYNUM` | int | YES | — | Onay numarası |
| 80 | `ISLETME_KODU` | int | YES | — | İşletme kodu |
| 81 | `ODEKOD` | varchar(100) | NO | — | Ödeme kodu |
| 82 | `BRMALIYET` | decimal | NO | — | Birim maliyet |
| 83 | `KOSVADEGUNU` | int | NO | — | Koşul vade günü |
| 84 | `YAPKOD` | varchar(15) | NO | — | Yapı kodu |
| 85 | `GIB_FATIRS_NO` | varchar(16) | NO | — | GİB fatura numarası (e-fatura) |
| 86 | `EXTERNALAPPID` | varchar(100) | NO | — | Dış uygulama ID'si |
| 87 | `EXTERNALREFID` | varchar(100) | NO | — | Dış referans ID'si |
| 88 | `EBELGE` | int | NO | — | E-belge tipi |
| 89 | `HALFAT` | int | NO | — | Hal faturası |
| 90 | `FAT_ALTM3` | decimal | NO | — | Fatura alt metni 3 |
| 91 | `DOVBAZTAR` | datetime | NO | — | Döviz baz tarihi |
| 92 | `OTVTEVTUTAR` | decimal | NO | — | ÖTV tevkifat tutarı |
| 93 | `TOPGIRDEPO` | int | NO | — | Toplam giriş deposu |
| 94 | `BFORM` | char(1) | NO | — | B formu |
| 95 | `TEVKIFATIADE` | int | NO | — | Tevkifat iadesi |
| 96 | `FATURALASMAYACAK` | char(1) | NO | — | Faturalaşmayacak |
| 97 | `KONAKLAMA` | int | NO | — | Konaklama vergisi |
| 98 | `SARJFAT` | int | NO | — | Şarj faturası |
| 99 | `DOVTUTGENISK1` | decimal | NO | — | Döviz tutarı genel iskonto 1 |
| 100 | `DOVTUTGENISK2` | decimal | NO | — | Döviz tutarı genel iskonto 2 |
| 101 | `DOVTUTGENISK3` | decimal | NO | — | Döviz tutarı genel iskonto 3 |
| 102 | `DOVTUTEKMAL1` | decimal | NO | — | Döviz tutarı ekmal 1 |
| 103 | `DOVTUTEKMAL2` | decimal | NO | — | Döviz tutarı ekmal 2 |
| 104 | `DOVTUTEKMAL3` | decimal | NO | — | Döviz tutarı ekmal 3 |
| 105 | `ILACFAT` | int | NO | — | İlaç faturası |
| 106 | `EHODBS` | char(1) | NO | — | E-HODBS |

### Örnek Veri

| FATIRS_NO | CARI_KODU | TARIH | KAYITYAPANKUL | KAPATILMIS |
|-----------|-----------|-------|---------------|------------|
| SIP-2026-0001 | 120-001 | 2026-05-01 | NULL | H |
| SIP-2026-0002 | 120-002 | 2026-05-03 | NULL | H |
| SIP-2026-0003 | 120-003 | 2026-05-05 | NULL | H |

---

## TBLSIPATRA — Sipariş Satırları

`TBLSIPAMAS` ile `FISNO = FATIRS_NO` üzerinden join yapılır.

| # | Kolon | Tip | Zorunlu | CP Mapping | Açıklama |
|---|-------|-----|---------|------------|----------|
| 1 | `STOK_KODU` | varchar(200) | YES | `Item.ErpId` | Ürün kodu (`TBLSTSABIT.STOK_KODU`) |
| 2 | `FISNO` | varchar(200) | YES | Sipariş ref | Bağlı sipariş no (`TBLSIPAMAS.FATIRS_NO`) |
| 3 | `STHAR_GCMIK` | decimal | NO | `InputItem.Quantity` | Miktar (adet) |
| 4 | `STHAR_GCMIK2` | decimal | NO | — | Miktar 2 (alternatif birim) |
| 5 | `CEVRIM` | decimal | NO | — | Birim çevirim katsayısı |
| 6 | `STHAR_GCKOD` | char(1) | YES | — | Giriş/çıkış kodu |
| 7 | `STHAR_TARIH` | datetime | YES | Satır tarihi | |
| 8 | `STHAR_NF` | decimal | NO | — | Net fiyat |
| 9 | `STHAR_BF` | decimal | NO | — | Brüt fiyat |
| 10 | `STHAR_IAF` | decimal | NO | — | İskonto sonrası fiyat |
| 11 | `STHAR_KDV` | int | NO | — | KDV oranı |
| 12 | `DEPO_KODU` | int | NO | — | Depo kodu |
| 13 | `STHAR_ACIKLAMA` | varchar(35) | NO | — | Satır açıklaması |
| 14 | `STHAR_SATISK` | decimal | NO | — | Satır iskontosu |
| 15 | `STHAR_MALFISK` | decimal | NO | — | Mal fazlası iskontosu |
| 16 | `STHAR_FTIRSIP` | char(1) | YES | — | Fatura/irsaliye/sipariş tipi |
| 17 | `STHAR_SATISK2` | decimal | NO | — | Satır iskontosu 2 |
| 18 | `LISTE_FIAT` | tinyint | NO | — | Liste fiyatı no |
| 19 | `STHAR_HTUR` | char(1) | YES | — | Hareket türü |
| 20 | `STHAR_DOVTIP` | tinyint | NO | — | Döviz tipi |
| 21 | `PROMASYON_KODU` | tinyint | NO | — | Promosyon kodu |
| 22 | `STHAR_DOVFIAT` | decimal | NO | — | Döviz fiyatı |
| 23 | `STHAR_ODEGUN` | int | NO | — | Ödeme günü |
| 24 | `STRA_SATISK3` | decimal | NO | — | Satır iskontosu 3 |
| 25 | `STRA_SATISK4` | decimal | NO | — | Satır iskontosu 4 |
| 26 | `STRA_SATISK5` | decimal | NO | — | Satır iskontosu 5 |
| 27 | `STRA_SATISK6` | decimal | NO | — | Satır iskontosu 6 |
| 28 | `STHAR_BGTIP` | char(1) | NO | — | Bağlantı tipi |
| 29 | `STHAR_KOD1` | char(1) | NO | — | Kod 1 |
| 30 | `STHAR_KOD2` | char(1) | NO | — | Kod 2 |
| 31 | `STHAR_SIPNUM` | varchar(200) | NO | — | Sipariş numarası (çapraz referans) |
| 32 | `STHAR_CARIKOD` | varchar(200) | NO | — | Müşteri kodu |
| 33 | `STHAR_SIP_TURU` | char(1) | NO | — | Sipariş türü |
| 34 | `PLASIYER_KODU` | varchar(200) | NO | — | Plasiyer kodu |
| 35 | `EKALAN_NEDEN` | char(1) | NO | — | Ek alan nedeni |
| 36 | `EKALAN` | varchar(200) | NO | — | Ek alan |
| 37 | `EKALAN1` | varchar(100) | NO | — | Ek alan 1 |
| 38 | `REDMIK` | decimal | NO | — | Reddedilen miktar |
| 39 | `REDNEDEN` | tinyint | NO | — | Red nedeni |
| 40 | `SIRA` | int | NO | — | Satır sırası |
| 41 | `STRA_SIPKONT` | int | NO | — | Sipariş kontrol |
| 42 | `AMBAR_KABULNO` | varchar(15) | NO | — | Ambar kabul numarası |
| 43 | `FIRMA_DOVTIP` | tinyint | NO | — | Firma döviz tipi |
| 44 | `FIRMA_DOVTUT` | decimal | NO | — | Firma döviz tutarı |
| 45 | `FIRMA_DOVMAL` | decimal | NO | — | Firma döviz maliyet |
| 46 | `UPDATE_KODU` | char(1) | NO | — | Güncelleme kodu |
| 47 | `IRSALIYE_NO` | varchar(200) | NO | — | İrsaliye numarası |
| 48 | `IRSALIYE_TARIH` | datetime | NO | — | İrsaliye tarihi |
| 49 | `KOSULKODU` | varchar(8) | NO | — | Koşul kodu |
| 50 | `ECZA_FAT_TIP` | tinyint | NO | — | Eczane fatura tipi |
| 51 | `STHAR_TESTAR` | datetime | NO | — | Test tarihi |
| 52 | `OLCUBR` | tinyint | NO | — | Ölçü birimi |
| 53 | `INCKEYNO` | int | YES | Satır unique key | Satır benzersiz anahtarı |
| 54 | `VADE_TARIHI` | datetime | NO | — | Vade tarihi |
| 55 | `LISTE_NO` | varchar(8) | NO | — | Liste numarası |
| 56 | `BAGLANTI_NO` | int | NO | — | Bağlantı numarası |
| 57 | `SUBE_KODU` | int | YES | — | Şube kodu |
| 58 | `MUH_KODU` | int | NO | — | Muhasebe kodu |
| 59 | `S_YEDEK1` | varchar(200) | NO | — | Yedek string 1 |
| 60 | `S_YEDEK2` | varchar(8) | NO | — | Yedek string 2 |
| 61 | `F_YEDEK3` | decimal | NO | — | Yedek decimal 3 |
| 62 | `F_YEDEK4` | decimal | NO | — | Yedek decimal 4 |
| 63 | `F_YEDEK5` | decimal | NO | — | Yedek decimal 5 |
| 64 | `C_YEDEK6` | char(1) | NO | — | Yedek char 6 |
| 65 | `B_YEDEK7` | tinyint | NO | — | Yedek byte 7 |
| 66 | `I_YEDEK8` | int | NO | — | Yedek int 8 |
| 67 | `L_YEDEK9` | int | NO | — | Yedek int 9 |
| 68 | `D_YEDEK10` | datetime | NO | — | Yedek datetime 10 |
| 69 | `PROJE_KODU` | varchar(200) | NO | — | Proje kodu |
| 70 | `FIYATTARIHI` | datetime | NO | — | Fiyat tarihi |
| 71 | `KOSULTARIHI` | datetime | NO | — | Koşul tarihi |
| 72 | `SATISK1TIP` | int | NO | — | Satır iskonto 1 tipi |
| 73 | `SATISK2TIP` | int | NO | — | Satır iskonto 2 tipi |
| 74 | `SATISK3TIP` | int | NO | — | Satır iskonto 3 tipi |
| 75 | `SATISK4TIP` | int | NO | — | Satır iskonto 4 tipi |
| 76 | `SATISK5TIP` | int | NO | — | Satır iskonto 5 tipi |
| 77 | `SATISK6TIP` | int | NO | — | Satır iskonto 6 tipi |
| 78 | `EXPORTTYPE` | tinyint | NO | — | İhracat tipi |
| 79 | `EXPORTMIK` | decimal | NO | — | İhracat miktarı |
| 80 | `ONAYTIPI` | char(1) | YES | — | Onay tipi |
| 81 | `ONAYNUM` | int | YES | — | Onay numarası |
| 82 | `KKMALF` | decimal | NO | — | KK mal fazlası |
| 83 | `STRA_IRSKONT` | int | NO | — | İrsaliye kontrol |
| 84 | `YAPKOD` | varchar(15) | NO | — | Yapı kodu |
| 85 | `MAMYAPKOD` | varchar(15) | NO | — | Mamul yapı kodu |
| 86 | `OTVFIYAT` | decimal | NO | — | ÖTV fiyatı |
| 87 | `IRS_INCKEYNO` | int | NO | — | İrsaliye satır key'i |
| 88 | `YEDEK11` | char(1) | NO | — | Yedek 11 |
| 89 | `YEDEK12` | char(1) | NO | — | Yedek 12 |
| 90 | `YEDEK13` | int | NO | — | Yedek 13 |
| 91 | `YEDEK14` | int | NO | — | Yedek 14 |
| 92 | `YEDEK15` | float | NO | — | Yedek 15 |
| 93 | `YEDEK16` | float | NO | — | Yedek 16 |
| 94 | `YEDEK17` | datetime | NO | — | Yedek 17 |
| 95 | `YEDEK18` | datetime | NO | — | Yedek 18 |
| 96 | `YEDEK19` | varchar(50) | NO | — | Yedek 19 |
| 97 | `YEDEK20` | varchar(50) | NO | — | Yedek 20 |

### Örnek Veri

| FISNO | STOK_KODU | STHAR_GCMIK | STHAR_TARIH | STHAR_CARIKOD |
|-------|-----------|-------------|-------------|---------------|
| SIP-2026-0015 | STK083 | 11 | 2026-05-29 | 120-015 |
| SIP-2026-0015 | STK044 | 363 | 2026-05-29 | 120-015 |
| SIP-2026-0015 | STK094 | 359 | 2026-05-29 | 120-015 |
| SIP-2026-0014 | STK093 | 132 | 2026-05-27 | 120-014 |
| SIP-2026-0014 | STK003 | 191 | 2026-05-27 | 120-014 |

---

## Önerilen Sorgular

### Açık siparişleri satırlarıyla çek

```sql
SELECT
    m.FATIRS_NO,
    m.CARI_KODU,
    m.TARIH,
    m.KAYITYAPANKUL,
    t.STOK_KODU,
    t.STHAR_GCMIK,
    t.STHAR_TARIH,
    t.INCKEYNO
FROM TBLSIPAMAS m
INNER JOIN TBLSIPATRA t ON t.FISNO = m.FATIRS_NO
WHERE m.KAPATILMIS IS NULL OR m.KAPATILMIS != 'H'
ORDER BY m.TARIH DESC
```

### Delta sync — son sync'ten beri değişenler

```sql
SELECT
    m.FATIRS_NO,
    m.CARI_KODU,
    m.TARIH,
    m.KAYITYAPANKUL,
    t.STOK_KODU,
    t.STHAR_GCMIK
FROM TBLSIPAMAS m
INNER JOIN TBLSIPATRA t ON t.FISNO = m.FATIRS_NO
WHERE m.KAYITTARIHI >= @LastSyncDate
   OR m.DUZELTMETARIHI >= @LastSyncDate
ORDER BY m.TARIH DESC
```

---

## ErpUserMapping Notu

`TBLSIPAMAS.KAYITYAPANKUL` `int` tipinde bir ERP kullanıcı ID'sidir.  
Cargo Pilot `ErpUserMapping` tablosunda `ErpUserId = KAYITYAPANKUL.ToString()` olarak saklanır.

- Eşleşme bulunursa → siparişi o kullanıcıya ata
- Eşleşme bulunamazsa → `Status = Invalid` kaydı oluştur, admin eşleştirene kadar beklet
