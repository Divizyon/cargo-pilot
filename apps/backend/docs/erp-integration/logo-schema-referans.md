# Logo Şema Referansı

Netsis tarafının karşılığı: `erp-schema-divizyon.md` (TBLSTSABIT).
Alan eşleşme kontratı: `ERP-ANALIZ-REF3-nihai-kontrat.md` (Netsis, `stoknetsis.accdb`'den çıkarıldı).

Bu belge Logo (Tiger / GO / Wings) veritabanının Cargo Pilot ürün senkronu için gereken
bölümünü tanımlar. Netsis'ten iki temel farkı vardır:

1. **Tablo adları firma ve döneme göre değişir** — sabit bir tablo adı yoktur.
2. **Ölçüler ürün kartında değil, birim atamasındadır** — bir ürünün her birimi için ayrı
   ölçü satırı vardır.

---

## 1. Tablo adlandırma: `LG_XXX_XX_`

| Parça | Anlamı | Örnek |
|---|---|---|
| `XXX` | Firma numarası, 3 hane, sola sıfır dolgulu | `009` |
| `XX` | Dönem numarası, 2 hane | `01` |

- **Firma seviyesi** (dönem yok): `LG_009_ITEMS`, `LG_009_ITMUNITA`, `LG_009_UNITSETL`
- **Dönem seviyesi**: `LG_009_01_STLINE`, `LG_009_01_INVOICE`, `LG_009_01_ORFICHE`
- **Firmadan bağımsız**: `L_CAPIDEF`, `L_GOUSERS`, `L_DAILYEXCHANGES`

Ürün çekimi yalnızca firma seviyesi tablolara dokunur; dönem numarası ürün senkronu için
gerekmez ama sipariş/sevkiyat yazımı (export) için gerekir.

> **Bağlantı ayarına etkisi:** Netsis'te veritabanı adı yeterliydi. Logo'da ayrıca **firma
> numarası** sorulmalıdır; dönem numarası yalnızca export açılacaksa gerekir.
> Yol haritası: Faz 5, madde 5.2.

---

## 2. Ürün çekimi için gereken zincir

```
LG_XXX_ITEMS  ──ITEMREF──▶  LG_XXX_ITMUNITA  ──UNITLINEREF──▶  LG_XXX_UNITSETL
(ürün kartı)                (birim başına ölçü)                 (birim tanımı)
```

### 2.1 `LG_XXX_ITEMS` — Malzemeler (ürün kartı)

| Kolon | Anlamı | Cargo Pilot karşılığı |
|---|---|---|
| `LOGICALREF` | Kayıt anahtarı (PK) | — (join için) |
| `CODE` | Malzeme kodu | `SKU`, `ErpId` |
| `NAME` | Malzeme adı | `Name` |
| `CARDTYPE` | Kart türü (1 Ticari mal, 10 Hammadde, 11 Yarımamul, 12 Mamul, 20/21/22 Malzeme sınıfı) | Eleme ölçütü |
| `ACTIVE` | Kayıt durumu | Eleme ölçütü |
| `STGRPCODE` | Grup kodu | `StackGroup` (anahtar kelime eşleşmesi) |
| `SPECODE` | Özel kod | Kullanılmıyor |
| `UNITSETREF` | Birim seti referansı | Birim çözümü |

**Malzeme sınıfları çekilmez:** `CARDTYPE` 20/21/22 fiziksel ürün değil, sınıf kaydıdır.
Netsis'te böyle bir ayrım yoktu; elenmezse ölçüsüz "ürünler" taslağa düşer.

### 2.2 `LG_XXX_ITMUNITA` — Malzeme-Birim ataması (ölçüler burada)

| Kolon | Anlamı | Cargo Pilot karşılığı |
|---|---|---|
| `ITEMREF` | `ITEMS.LOGICALREF` | join |
| `UNITLINEREF` | `UNITSETL.LOGICALREF` | join |
| `WIDTH` | Genişlik | `Width` |
| `LENGTH` | Uzunluk / derinlik | `Length` |
| `HEIGHT` | Yükseklik | `Height` |
| `WEIGHT` | Net ağırlık | `Weight` |
| `GROSSWEIGHT` | Brüt ağırlık | Alternatif ağırlık kaynağı |
| `GROSSVOLUME` / `NETVOLUME` | Hacim | Doğrulama için |
| `BARCODE` | Barkod | `Barcode` |
| `CONVFACT1` / `CONVFACT2` | Ana birime çevrim katsayıları | Birim çözümü |

> **Netsis'e göre en büyük avantaj:** Logo'da kolon adları açık — `WIDTH` / `LENGTH` /
> `HEIGHT`. Netsis'teki `EN` / `BOY` / `GENISLIK` anlam belirsizliği burada yoktur.

> **Ama yeni bir belirsizlik var:** Bir ürünün birim setindeki **her birim için ayrı satır**
> vardır (adet, koli, palet…) ve ölçüler o birime aittir. Yanlış satır seçilirse ürün
> "adet" ölçüsü yerine "koli" ölçüsüyle planlanır. Ana birim satırı seçilmelidir
> (`UNITSETL.MAINUNIT`); aksi halde hangi kutunun planlandığı belirsizleşir.

### 2.3 `LG_XXX_UNITSETL` — Birimler

| Kolon | Anlamı |
|---|---|
| `LOGICALREF` | Kayıt anahtarı |
| `UNITSETREF` | Bağlı olduğu birim seti (`UNITSETF`) |
| `CODE` / `NAME` | Birim kodu ve adı (ADET, KOLI, KG…) |
| `MAINUNIT` | Ana birim işareti |
| `LINENR` | Set içindeki sıra |

Birim adı, Faz 3'te eklenen **ölçü birimi** ayarıyla karıştırılmamalıdır:
`UNITSETL.CODE` ürünün stok birimidir (adet/kg); ölçü kolonlarının birimi (cm/mm) ayrı bir
bilgidir ve bağlantı ayarından gelir.

---

## 3. Müşteri kurulumunda doğrulanacaklar

Aşağıdakiler Logo sürümüne (Tiger 3 / GO 3 / Wings) göre değişebilir ve **gerçek bir Logo
veritabanında teyit edilmeden koda sabitlenmemelidir**:

| # | Doğrulanacak | Neden önemli |
|---|---|---|
| 1 | `ACTIVE` kolonunda hangi değer "aktif" demek | Ters okunursa ya hiç ürün gelir ya hepsi gelir |
| 2 | Ana birim satırı nasıl seçiliyor (`MAINUNIT` mi, `LINENR = 1` mi) | Yanlış satır → yanlış ölçü |
| 3 | Ölçü kolonlarının birimi (cm mi mm mi) | Faz 3'teki birim ayarına girdi |
| 4 | `WEIGHT` mi `GROSSWEIGHT` mi kullanılmalı | Planlama ağırlığı |
| 5 | Barkodun `ITMUNITA.BARCODE` dışında ayrı tabloda tutulup tutulmadığı | Barkod boş kalabilir |
| 6 | Firma numarasının hane sayısı ve sıfır dolgusu | Tablo adı kurulamazsa bağlantı hiç açılmaz |

Doğrulama sorgusu (müşteri ortamında, salt-okunur hesapla çalıştırılır):

```sql
SELECT TOP 20
       I.CODE, I.NAME, I.CARDTYPE, I.ACTIVE, I.STGRPCODE,
       U.CODE AS BIRIM, U.MAINUNIT,
       UA.WIDTH, UA.LENGTH, UA.HEIGHT,
       UA.WEIGHT, UA.GROSSWEIGHT, UA.BARCODE
FROM LG_XXX_ITEMS I
JOIN LG_XXX_ITMUNITA UA ON UA.ITEMREF = I.LOGICALREF
JOIN LG_XXX_UNITSETL U  ON U.LOGICALREF = UA.UNITLINEREF
ORDER BY I.CODE;
```

---

## 4. Export (sipariş yazımı) için ilgili tablolar

Plan onayında ERP'ye yazma açılırsa dönem seviyesi tablolar gerekir:

| Tablo | Açıklama |
|---|---|
| `LG_XXX_XX_ORFICHE` | Sipariş fişleri (başlık) |
| `LG_XXX_XX_ORFLINE` | Sipariş hareketleri (satır) |
| `LG_XXX_XX_STFICHE` | Stok fişleri / irsaliye başlığı |
| `LG_XXX_XX_STLINE` | Malzeme hareketleri (satır) |
| `LG_XXX_CLCARD` | Cari hesap kartları (alıcı) |
| `LG_XXX_SHIPINFO` | Sevkiyat adresleri |

Netsis tarafındaki karşılığı `TBLSIPAMAS` / `TBLSIPATRA`'dır. Export bayrağı
(`Erp:ExportEnabled`) kapalı olduğu sürece bu tablolara yazılmaz.

---

## 5. Tam tablo kataloğu

Liste saha kaynaklıdır ve olduğu gibi korunur. Cargo Pilot yalnızca 2. ve 4. bölümde
işaretlenen tabloları kullanır.

### 5.1 Firma tabloları (`LG_XXX_...`)

| Tablo | Açıklama |
|---|---|
| `LG_XXX_ITEMS` | Malzemeler |
| `LG_XXX_ITMUNITA` | Malzeme-Birim ataması |
| `LG_XXX_UNITSETF` | Birim setleri |
| `LG_XXX_UNITSETL` | Birimler |
| `LG_XXX_UNITSETC` | Birim setleri arası çevrim katsayıları |
| `LG_XXX_INVDEF` | Malzeme-Ambar bilgileri |
| `LG_XXX_ITEMSUBS` | Malzeme alternatifleri |
| `LG_XXX_ITMCLSAS` | Malzeme-Malzeme sınıfı ataması |
| `LG_XXX_ITMFACTP` | Malzeme-Fabrika bilgileri |
| `LG_XXX_ITMBOMAS` | Malzeme-Ürün reçetesi ataması |
| `LG_XXX_ITMWSDEF` | Malzeme-İş istasyonu bilgileri |
| `LG_XXX_ITMWSTOT` | Malzeme-İş istasyonu toplamları (günlük) |
| `LG_XXX_SUPPASGN` | Malzeme-Tedarikçi ataması |
| `LG_XXX_SELCHVAL` | Malzeme-Özellik değerleri |
| `LG_XXX_CHARASGN` | Malzeme özellik ataması |
| `LG_XXX_CHARCODE` | Özellik kodları |
| `LG_XXX_CHARVAL` | Özellik değerleri |
| `LG_XXX_STCOMPLN` | Karma koli satırları |
| `LG_XXX_LOCATION` | Stok yerleri |
| `LG_XXX_CLCARD` | Cari hesap kartları |
| `LG_XXX_CLINTEL` | Cari hesap istihbarat bilgileri |
| `LG_XXX_SHIPINFO` | Sevkiyat adresleri |
| `LG_XXX_SLSMAN` | Satış elemanları |
| `LG_XXX_SLSCLREL` | Satış elemanı-Cari hesap ilişkisi |
| `LG_XXX_ROUTE` | Satış yönetim raporları |
| `LG_XXX_ROUTETRS` | Satış rota satırları |
| `LG_XXX_TARGETS` | Satış elemanı hareketleri |
| `LG_XXX_PRCLIST` | Alış/Satış fiyatları |
| `LG_XXX_ASCOND` | Alış/Satış koşulları |
| `LG_XXX_PRCARDS` | Promosyon kartları |
| `LG_XXX_DECARDS` | İndirim/Masraf kartları |
| `LG_XXX_PAYPLANS` | Ödeme planları |
| `LG_XXX_PAYLINES` | Ödeme plan satırları |
| `LG_XXX_SPECODES` | Özel kodlar |
| `LG_XXX_ACCCODES` | Entegrasyon bağlantı kodları |
| `LG_XXX_CRDACREF` | Kart-Muhasebe kodları |
| `LG_XXX_EMUHACC` | Muhasebe hesapları |
| `LG_XXX_KSCARD` | Kasalar |
| `LG_XXX_BNCARD` | Bankalar |
| `LG_XXX_BANKACC` | Banka hesapları |
| `LG_XXX_EMPLOYEE` | Çalışanlar |
| `LG_XXX_EMPGROUP` | Çalışan grubu |
| `LG_XXX_EMGRPASS` | Çalışan-Grup ataması |
| `LG_XXX_EMCENTER` | Masraf merkezleri |
| `LG_XXX_LABORREQ` | Çalışan ihtiyaçları |
| `LG_XXX_TOOLREQ` | Araç ihtiyaçları |
| `LG_XXX_WORKSTAT` | İş istasyonları |
| `LG_XXX_WSGRPF` | İş istasyonu grupları |
| `LG_XXX_WSGRPASS` | İş istasyonu-grup ataması |
| `LG_XXX_WSCHCODE` | İş istasyonu özellikleri |
| `LG_XXX_WSCHVAL` | İş istasyonu özellik değerleri |
| `LG_XXX_WSATTASG` | İş istasyonu-Özellik ataması |
| `LG_XXX_WSATTVAS` | İş istasyonu-Özellik değeri ataması |
| `LG_XXX_OPERTION` | Operasyonlar |
| `LG_XXX_OPRTREQ` | Operasyon ihtiyaçları |
| `LG_XXX_OPATTASG` | Operasyon-Özellik ataması |
| `LG_XXX_LNOPASGN` | Operasyon-Malzeme ilişkisi |
| `LG_XXX_PRVOPASG` | Önceki operasyon ilişkileri |
| `LG_XXX_ROUTING` | Üretim rotaları |
| `LG_XXX_RTNGLINE` | Üretim rota satırları |
| `LG_XXX_PRODORD` | Üretim emirleri |
| `LG_XXX_DISPLINE` | İş emirleri |
| `LG_XXX_OCCUPATN` | Kaynak kullanımları (üretim) |
| `LG_XXX_PEGGING` | İşlem bağlantıları (üretim emri, sipariş) |
| `LG_XXX_BOMASTER` | Ürün reçeteleri |
| `LG_XXX_BOMLINE` | Ürün reçete satırları |
| `LG_XXX_BOMREVSN` | Ürün reçete revizyonları |
| `LG_XXX_COPRDBOM` | Reçete-ek ürün ataması |
| `LG_XXX_ENGCLINE` | Mühendislik değişikliği işlemi |
| `LG_XXX_QCSET` | Kalite kontrol setleri |
| `LG_XXX_QCSLINE` | Kalite kontrol satırları |
| `LG_XXX_QCLVAL` | Kalite kontrol değerleri |
| `LG_XXX_QASGN` | Kalite kontrol hareketi-ataması |
| `LG_XXX_FAREGIST` | Sabit kıymet kayıtları |
| `LG_XXX_FAYEAR` | Sabit kıymet yıllık kaydı |
| `LG_XXX_SRVCARD` | Hizmet kartları |
| `LG_XXX_SRVUNITA` | Hizmet kaydı-Birim ataması |
| `LG_XXX_DISTTEMP` | Dağıtım şablonları |
| `LG_XXX_DISTLINE` | Dağıtım şablonu satırları |
| `LG_XXX_FIRMDOC` | Doküman katalog girişi (watermark) |
| `LG_XXX_LNGEXCSETS` | Kayıtların diğer dillerdeki açıklamaları |
| `LG_XXX_LOGREP` | LOG (izleme) kaydı |
| `LG_XXX_TRGPAR` | Trigger parametreleri |

### 5.2 Firma + dönem tabloları (`LG_XXX_XX_...`)

| Tablo | Açıklama |
|---|---|
| `LG_XXX_XX_ORFICHE` | Sipariş fişleri |
| `LG_XXX_XX_ORFLINE` | Sipariş hareketleri |
| `LG_XXX_XX_STFICHE` | Stok fişleri |
| `LG_XXX_XX_STLINE` | Malzeme hareketleri |
| `LG_XXX_XX_INVOICE` | Faturalar |
| `LG_XXX_XX_CLFICHE` | Cari hesap fişleri |
| `LG_XXX_XX_CLFLINE` | Cari hesap hareketleri |
| `LG_XXX_XX_CLTOTFIL` | Cari hesap aylık toplamları |
| `LG_XXX_XX_CLRNUMS` | Cari hesap risk tabloları |
| `LG_XXX_XX_BNFICHE` | Banka fişleri |
| `LG_XXX_XX_BNFLINE` | Banka hareketleri |
| `LG_XXX_XX_BNTOTFIL` | Banka aylık toplamları |
| `LG_XXX_XX_CSCARD` | Çek/Senet kartları |
| `LG_XXX_XX_CSROLL` | Çek/Senet bordroları |
| `LG_XXX_XX_CSTRANS` | Çek/Senet hareketleri |
| `LG_XXX_XX_CSHTOTS` | Kasa aylık toplamları |
| `LG_XXX_XX_KSLINES` | Kasa işlemleri |
| `LG_XXX_XX_EMFICHE` | Muhasebe fişleri |
| `LG_XXX_XX_EMFLINE` | Muhasebe hareketleri |
| `LG_XXX_XX_EMUHTOT` | Muhasebe aylık toplamları |
| `LG_XXX_XX_PAYTRANS` | Ödeme/Tahsilat hareketleri |
| `LG_XXX_XX_STINVENS` | Malzeme alış/satış aylık toplamları |
| `LG_XXX_XX_STINVTOT` | Günlük malzeme ambar toplamları |
| `LG_XXX_XX_SERILOTN` | Malzeme seri/lot no bilgileri |
| `LG_XXX_XX_SLTRANS` | Seri/Lot hareketleri |
| `LG_XXX_XX_SLQCASGN` | Kalite kontrol hareketleri |
| `LG_XXX_XX_SRVNUMS` | Aylık hizmet toplamları |
| `LG_XXX_XX_SRVTOT` | Aylık hizmet alış/satış toplamları |
| `LG_XXX_XX_PRDCOST` | Maliyet dönem kapama kayıtları |
| `LG_XXX_XX_PRODUCER` | Müstahsil faturası |
| `LG_XXX_XX_PERDOC` | Doküman bilgileri (malzeme resmi) |
| `LG_XXX_XX_FOLDER` | Doküman katalog bilgileri |
| `LG_XXX_XX_TRANSAC` | Firma dönem bilgileri |

### 5.3 Firmadan bağımsız tablolar (`L_...`)

| Tablo | Açıklama |
|---|---|
| `L_CAPIDEF` | Kuruluş bilgileri (ambar, işyeri, fabrika) |
| `L_GOUSERS` | Kullanıcılar |
| `L_NET` | Hangi kullanıcı hangi firma/dönemle çalışıyor |
| `L_DAILYEXCHANGES` | Günlük döviz kurları |
| `L_LDOCNUM` | Doküman numaralama şablonları |
| `L_CDBTMP` | Form boyutları |
| `L_COUNTRY` / `L_CITY` / `L_TOWN` / `L_DISTRICT` / `L_POSTCODE` | Adres bilgileri |
| `L_BANKCODE` / `L_BNBRANCH` | Banka ve şube bilgileri |
| `L_TAXOFFICE` | Vergi daireleri |
| `L_SHPAGENT` | Sevkiyat firmaları |
| `L_SHPTYPES` | Sevkiyat/teslim türleri |
| `L_FRGTYPES` | Taşıma tipleri |
| `L_TRADGRP` | Ticari işlem grupları |
| `L_GTIP_CODE` / `L_GTIP_DEF` | GTİP kodları ve tanımları |
| `L_PRICEINDEX` / `L_PRICEINDEXTYP` | Fiyat endeksleri ve türleri |
| `L_ORGDEFS` / `L_POSDEFS` / `L_ORGDOC` | Organizasyon şeması |
| `L_RPFILTSXXX` / `L_RPLAYS_XXX` | Kaydedilen rapor filtreleri ve tasarımları |
| `L_LDOCFOLD` / `L_LDOCITEM` | Doküman katalog ve tanımları |

---

## 6. Kod sözlükleri

Ürün senkronu bunları kullanmaz; export ve raporlama için referanstır.

### 6.1 `ITEMS.CARDTYPE` — kart türü

| Değer | Anlamı |
|---|---|
| 1 | Ticari mal |
| 2 | Karma koli |
| 3 | Depozitolu mal |
| 4 | Sabit kıymet |
| 10 | Hammadde |
| 11 | Yarımamul |
| 12 | Mamul |
| 13 | Tüketim malı |
| 20 | Malzeme sınıfı (genel) |
| 21 | Malzeme sınıfı (tablolu) |
| 22 | Varsayılan malzeme sınıfı |

### 6.2 `INVOICE.TRCODE` — fatura türü

| Değer | Anlamı |
|---|---|
| 1 | Mal alım faturası |
| 2 | Perakende satış iade faturası |
| 3 | Toptan satış iade faturası |
| 4 | Alınan hizmet faturası |
| 5 | Alınan proforma fatura |
| 6 | Alım iade faturası |
| 7 | Perakende satış faturası |
| 8 | Toptan satış faturası |
| 9 | Verilen hizmet faturası |
| 10 | Verilen proforma fatura |
| 13 | Alınan fiyat farkı faturası |
| 14 | Verilen fiyat farkı faturası |
| 26 | Müstahsil makbuzu |

### 6.3 `STFICHE.TRCODE` — stok fişi türü

| Değer | Anlamı |
|---|---|
| 1 | Mal alım irsaliyesi |
| 2 | Perakende satış iade irsaliyesi |
| 3 | Toptan satış iade irsaliyesi |
| 4 | Konsinye çıkış iade irsaliyesi |
| 5 | Konsinye giriş irsaliyesi |
| 6 | Alım iade irsaliyesi |
| 7 | Perakende satış irsaliyesi |
| 8 | Toptan satış irsaliyesi |
| 9 | Konsinye çıkış irsaliyesi |
| 10 | Konsinye giriş iade irsaliyesi |
| 11 | Fire fişi |
| 12 | Sarf fişi |
| 13 | Üretimden giriş fişi |
| 14 | Devir fişi |
| 25 | Ambar fişi |
| 26 | Müstahsil irsaliyesi |
| 50 | Sayım fazlası fişi |
| 51 | Sayım eksiği fişi |

### 6.4 `CLCARD.ACTIVE` — cari kart tipi

| Değer | Anlamı |
|---|---|
| 1 | Alıcı |
| 2 | Satıcı |
| 3 | Alıcı + Satıcı |

### 6.5 `CLFLINE.TRCODE` — cari hesap hareket türü

| Değer | Anlamı | Modül |
|---|---|---|
| 1 | Nakit tahsilat | 5 |
| 2 | Nakit ödeme | 5 |
| 3 | Borç dekontu | 5 |
| 4 | Alacak dekontu | 5 |
| 5 | Virman fişi | 5 |
| 6 | Kur farkı işlemi | — |
| 12 | Özel işlem | — |
| 14 | Açılış fişi | 5 |
| 20 | Gelen havale | 7 |
| 21 | Gönderilen havale | 7 |
| 31 | Mal alım faturası | 4 |
| 32 | Perakende satış iade faturası | 4 |
| 33 | Toptan satış iade faturası | 4 |
| 34 | Alınan hizmet faturası | 4 |
| 35 | Alınan proforma fatura | — |
| 36 | Alım iade faturası | 4 |
| 37 | Perakende satış faturası | 4 |
| 38 | Toptan satış faturası | 4 |
| 39 | Verilen hizmet faturası | 4 |
| 40 | Verilen proforma fatura | — |
| 41 | Verilen vade farkı faturası | 4 |
| 42 | Alınan vade farkı faturası | 4 |
| 43 | Alınan fiyat farkı faturası | 4 |
| 44 | Verilen fiyat farkı faturası | 4 |
| 45 | Verilen serbest meslek makbuzu | 5 |
| 46 | Alınan serbest meslek makbuzu | 5 |
| 56 | Müstahsil makbuzu | 4 |
| 61 | Çek girişi | 6 |
| 62 | Senet girişi | 6 |
| 63 | Çek çıkış | 6 |
| 64 | Senet çıkış | 6 |
| 70 | Kredi kartı fişi | 5 |
| 71 | Kredi kartı iade fişi | 5 |
| 72 | Firma kredi kartı fişi | 5 |
| 73 | Firma kredi kartı iade fişi | 5 |
| 81 | Alınan sipariş | 3 |
| 82 | Verilen sipariş | 3 |

### 6.6 `CSROLL.TRCODE` — çek/senet bordro türü

| Değer | Anlamı |
|---|---|
| 1 | Çek girişi |
| 2 | Senet girişi |
| 3 | Çek çıkış (cari hesaba) |
| 4 | Senet çıkış (cari hesaba) |
| 5 | Çek çıkış (banka tahsil) |
| 6 | Senet çıkış (banka tahsil) |
| 7 | Çek çıkış (banka teminat) |
| 8 | Senet çıkış (banka teminat) |
| 9 | İşlem bordrosu (müşteri çeki) |
| 10 | İşlem bordrosu (müşteri senedi) |
| 11 | İşlem bordrosu (kendi çekimiz) |
| 12 | İşlem bordrosu (borç senedimiz) |

### 6.7 `CSTRANS.STATUS` — çek/senet hareket durumu

| Değer | Anlamı |
|---|---|
| 1 | Portföyde |
| 2 | Ciro edildi |
| 3 | Teminata verildi |
| 4 | Tahsile verildi |
| 5 | Protestolu tahsile verildi |
| 6 | İade edildi |
| 7 | Protesto edildi |
| 8 | Tahsil edildi |
| 9 | Kendi çekimiz |
| 10 | Borç senedimiz |
| 11 | Karşılığı yok |
| 12 | Tahsil edilemiyor |

### 6.8 Çek/senet akışı — hangi tablo ne tutar

- Çek/senet kartları `LG_XXX_XX_CSCARD`'da; güncel durum `CURRSTAT` kolonundadır.
- Her hareket `LG_XXX_XX_CSTRANS`'a çek referansıyla (`CSREF`) yazılır; bir çek birden çok
  satıra dağılır.
- Bordro başlıkları `LG_XXX_XX_CSROLL`'da; hareket satırları bordroya `ROLLREF` +
  `LINENO_` ile bağlanır. Devir çekleri bordrosuz olduğu için burada görünmez.
- Bankada işlem gören çekler ayrıca `LG_XXX_XX_BNFICHE` / `LG_XXX_XX_BNFLINE`'a yazılır.
- Bordroların cari karşılığı `LG_XXX_XX_CLFLINE`'a, vade kontrolü için satır satır
  `LG_XXX_XX_PAYTRANS`'a düşer; borç/alacak toplamları buradan oluşur.
