-- ============================================
-- Sahte Netsis ERP kaynagi — yalnizca e2e/test ortami
-- ============================================
-- Sema kaynagi: apps/backend/docs/erp-integration/erp-schema-divizyon.md
-- Sorgu kaynagi: NetsisProductFetcher.BuildSql — TBLSTSABIT uzerinden
--   STOK_KODU, STOK_ADI, BIRIM_AGIRLIK, EN, BOY, GENISLIK, GRUP_KODU,
--   DEPO_KODU, BARKOD1 okunur; SATISKILIT = 'E' satirlar cekilmez.
-- Tablo gercek Netsis'in 134 kolonunun tamami degildir; fetcher'in okudugu
-- kolonlar birebir ayni ad ve tiplerle tutulur.
-- Betik yeniden calistirilabilir: tablo her seferinde bastan kurulur.
--
-- Alan eslemesi (SyncErpItemsCommandHandler):
--   EN            -> Width  (cm)
--   BOY           -> Length (cm, derinlik)
--   GENISLIK      -> Height (cm)
--   BIRIM_AGIRLIK -> Weight (kg)
--   GRUP_KODU     -> DraftItem.StackGroup; ErpLoadGroupResolver anahtar kelime
--                    eslesmesiyle turetir, eslesme yoksa "Genel". Tip
--                    (ItemCategory) GRUP_KODU'ndan turetilmez; ERP kaynakli
--                    taslaklar sabit "Koli" (Box) ile acilir.
--   Olcu/agirlik 0 veya NULL -> satir elenmez, taslaga "eksik alan" isaretiyle
--                    duser (ERP-09).
-- ============================================

IF DB_ID('ERPTEST') IS NULL
    CREATE DATABASE ERPTEST;
GO

USE ERPTEST;
GO

IF OBJECT_ID('dbo.TBLSTSABIT', 'U') IS NOT NULL
    DROP TABLE dbo.TBLSTSABIT;
GO

-- Metin kolonlari Turkish_CI_AS ile kurulur: gercek Netsis kurulumlarinin
-- collation'i budur ve İ/Ş/Ğ gibi harfler varchar'da korunur. Sunucu
-- varsayilani (Latin1) birakilirsa bu harfler sessizce ASCII'ye duser ve
-- ErpLoadGroupResolver'in Turkce karakter normalizasyonu hic denenmemis olur.
CREATE TABLE dbo.TBLSTSABIT (
    STOK_KODU     varchar(100)   COLLATE Turkish_CI_AS NOT NULL PRIMARY KEY,
    STOK_ADI      varchar(200)   COLLATE Turkish_CI_AS NULL,
    GRUP_KODU     varchar(100)   COLLATE Turkish_CI_AS NULL,
    BARKOD1       varchar(35)    COLLATE Turkish_CI_AS NULL,
    DEPO_KODU     int            NULL,
    BIRIM_AGIRLIK decimal(18, 4) NULL,
    EN            decimal(18, 4) NULL,
    BOY           decimal(18, 4) NULL,
    GENISLIK      decimal(18, 4) NULL,
    SATISKILIT    char(1)        NULL
);
GO

-- Dize sabitleri N ile oneklenir. Oneksiz yazilirsa sabit, veritabaninin
-- varsayilan collation'i (Latin1) ile ayristirilir ve kolon Turkish_CI_AS olsa
-- bile İ/Ş harfleri daha yazilmadan I/S'ye duser.
INSERT INTO dbo.TBLSTSABIT
    (STOK_KODU, STOK_ADI, GRUP_KODU, BARKOD1, DEPO_KODU, BIRIM_AGIRLIK, EN, BOY, GENISLIK, SATISKILIT)
VALUES
    -- ── Gida (beklenen StackGroup: "Gıda") ──────────────────────────────────
    (N'153.01.0001', N'Konserve Nohut 800 g - 12 li Koli',    N'01.GIDA.KONSERVE',    N'8690504001017', 1,  10.4000,  32.00,  24.00,  18.00, NULL),
    (N'153.01.0002', N'Ayçiçek Yağı 5 L - 4 lu Koli',         N'01-GIDA-KURU',        N'8690504001024', 1,  18.8000,  30.00,  30.00,  32.00, NULL),
    (N'153.02.0011', N'Meyve Suyu 1 L - 12 li Koli',          N'MAM.MEYVE.SUYU',      N'8690504002014', 1,  13.2000,  40.00,  30.00,  24.00, NULL),
    (N'153.02.0012', N'Maden Suyu 200 ml - 24 lu Paket',      N'GIDA/İÇECEK/01',      N'8690504002021', 2,   6.1000,  36.00,  24.00,  12.00, NULL),
    (N'153.03.0021', N'UHT Süt 1 L - 12 li Koli',             N'SÜT-ÜRÜNLERİ-04',     N'8690504003011', 2,  12.6000,  38.00,  28.00,  25.00, NULL),

    -- ── Kimya (beklenen StackGroup: "Kimya") ────────────────────────────────
    (N'320.11.0001', N'Sentetik Boya 15 L Bidon',             N'KİMYA-BOYA-11',       N'8690721001019', 2,  17.5000,  30.00,  30.00,  38.00, NULL),
    (N'320.11.0002', N'Tiner Selülozik 5 L',                  N'05.KİMYA.SOLVENT',    N'8690721001026', 2,   4.3000,  18.00,  18.00,  28.00, NULL),
    (N'320.12.0007', N'Endüstriyel Yapıştırıcı 20 kg',        N'CHEM-ADHESIVE-02',    N'8690721001217', 2,  21.0000,  35.00,  35.00,  40.00, NULL),
    (N'320.13.0009', N'Kireç Çözücü Asit 10 L',               N'ASİT-TEMİZLİK-07',    N'8690721001309', 2,  11.2000,  24.00,  24.00,  36.00, NULL),

    -- ── Tehlikeli Madde (beklenen StackGroup: "Tehlikeli Madde") ────────────
    (N'410.03.0001', N'Aerosol Sprey 400 ml - 24 lu Koli',    N'PARLAYICI-AEROSOL',   N'8690333001012', 3,   9.6000,  34.00,  26.00,  22.00, NULL),
    (N'410.03.0002', N'Tüp Gaz Kartuşu 450 g - 12 li',        N'ADR-SINIF3-01',       N'8690333001029', 3,   6.4000,  28.00,  21.00,  15.00, NULL),
    (N'410.04.0005', N'Lityum Pil Paketi - Sevkiyat Kolisi',  N'TEHLİKELİ-MADDE-02',  N'8690333001500', 3,   7.8000,  30.00,  20.00,  16.00, NULL),

    -- ── Elektronik (beklenen StackGroup: "Elektronik") ──────────────────────
    (N'600.01.0001', N'55 inç LED TV',                        N'03.ELEKTRONİK.TV',    N'8690842001011', 1,  16.9000, 128.00,  18.00,  78.00, NULL),
    (N'600.02.0004', N'Buzdolabı No-Frost 480 L',             N'BEYAZEŞYA-BUZDOLABI', N'8690842002049', 1,  72.0000,  70.00,  72.00, 185.00, NULL),
    (N'600.05.0031', N'NYAF Kablo 3x2.5 - 100 m Makara',      N'ELEKTRİK-KABLO-09',   N'8690842005318', 1,  14.5000,  42.00,  42.00,  26.00, NULL),

    -- ── Tekstil (beklenen StackGroup: "Tekstil") ────────────────────────────
    (N'710.01.0002', N'Banyo Havlusu 70x140 - 20 li Balya',   N'TEKSTİL-HAVLU-01',    N'8690159001028', 3,  11.0000,  60.00,  40.00,  35.00, NULL),
    (N'710.02.0008', N'Denim Kumaş Topu 50 m',                N'07.KUMAŞ.DENIM',      N'8690159002087', 3,  32.0000, 160.00,  38.00,  38.00, NULL),
    (N'710.04.0015', N'Erkek Gömlek - 40 lı Koli',            N'KONFEKSİYON-GÖMLEK',  N'8690159004159', 3,   9.2000,  55.00,  38.00,  30.00, NULL),

    -- ── Eslesmeyen / bos / NULL grup kodu (beklenen StackGroup: "Genel") ────
    (N'900.01.0001', N'Ticari Mal - Karışık Koli',            N'TİCARİ-MAL-001',      N'8690999000019', 1,   8.0000,  40.00,  30.00,  30.00, NULL),
    (N'900.02.0044', N'Oluklu Mukavva Koli 40x30x30',         N'AMB-KOLİ-12',         N'8690999000446', 1,   0.4500,  40.00,  30.00,  30.00, NULL),
    (N'900.03.0033', N'Yedek Parça - Rulman Seti',            N'YEDEK-PARÇA-33',      NULL,             2,   3.6000,  22.00,  22.00,  14.00, NULL),
    (N'900.04.0001', N'Grup Kodu Boş Ürün',                   N'',                    NULL,             1,   5.5000,  25.00,  25.00,  25.00, NULL),
    (N'900.04.0002', N'Grup Kodu NULL Ürün',                  NULL,                   NULL,             1,   5.5000,  25.00,  25.00,  25.00, NULL),

    -- ── Eksik olcu/agirlik: satir cekilir, "eksik alan" isaretiyle taslaga duser
    (N'950.01.0001', N'Ölçüsü Girilmemiş Parça',              N'01.GIDA.KONSERVE',    NULL,             1,   2.5000,   0.00,   0.00,   0.00, NULL),
    (N'950.01.0002', N'Ölçüleri NULL Parça',                  N'KİMYA-BOYA-11',       NULL,             2,     NULL,   NULL,   NULL,   NULL, NULL),
    (N'950.02.0003', N'Yalnız Ağırlığı Eksik Parça',          N'TEKSTİL-HAVLU-01',    N'8690777000037', 3,   0.0000,  30.00,  20.00,  15.00, NULL),
    (N'950.02.0004', N'Yalnız Yüksekliği Eksik Parça',        N'03.ELEKTRONİK.TV',    N'8690777000044', 1,   4.2000,  30.00,  20.00,   0.00, NULL),

    -- ── Satisa kapali: hic cekilmez, yalnizca SalesLocked eleme sayiminda gorunur
    (N'990.01.0001', N'Satışa Kapalı Ürün - Kimyasal',        N'05.KİMYA.SOLVENT',    NULL,             2,   5.0000,  30.00,  30.00,  30.00, N'E'),
    (N'990.01.0002', N'Satışa Kapalı Ürün - Gıda',            N'01-GIDA-KURU',        NULL,             1,   7.0000,  35.00,  25.00,  20.00, N'E');
GO

-- Tohumlama ozeti: toplam, elenen ve cekilebilir satir sayilari.
SELECT
    COUNT(*)                                                      AS SourceTotal,
    SUM(CASE WHEN ISNULL(SATISKILIT, '') = 'E' THEN 1 ELSE 0 END)  AS SalesLocked,
    SUM(CASE WHEN ISNULL(SATISKILIT, '') <> 'E' THEN 1 ELSE 0 END) AS Eligible
FROM dbo.TBLSTSABIT;
GO

-- Turkce karakterlerin gercekten yazildiginin kaniti: CP1254'te İ = 0xDD,
-- Ş = 0xDE. Sifir gelirse betik yanlis kod sayfasiyla calistirilmistir.
SELECT
    SUM(CASE WHEN CHARINDEX(0xDD, CAST(GRUP_KODU AS varbinary(200))) > 0 THEN 1 ELSE 0 END) AS GrupKoduWithDottedI,
    SUM(CASE WHEN CHARINDEX(0xDE, CAST(GRUP_KODU AS varbinary(200))) > 0 THEN 1 ELSE 0 END) AS GrupKoduWithSCedilla
FROM dbo.TBLSTSABIT;
GO

-- Depo bazli dagilim; depo filtresi denemelerinde kullanilir.
SELECT DEPO_KODU, COUNT(*) AS RowCountByWarehouse
FROM dbo.TBLSTSABIT
WHERE ISNULL(SATISKILIT, '') <> 'E'
GROUP BY DEPO_KODU
ORDER BY DEPO_KODU;
GO
