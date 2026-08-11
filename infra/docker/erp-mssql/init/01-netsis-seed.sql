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
-- ============================================

IF DB_ID('ERPTEST') IS NULL
    CREATE DATABASE ERPTEST;
GO

USE ERPTEST;
GO

IF OBJECT_ID('dbo.TBLSTSABIT', 'U') IS NOT NULL
    DROP TABLE dbo.TBLSTSABIT;
GO

CREATE TABLE dbo.TBLSTSABIT (
    STOK_KODU     varchar(100)  NOT NULL PRIMARY KEY,
    STOK_ADI      varchar(200)  NULL,
    GRUP_KODU     varchar(100)  NULL,
    BARKOD1       varchar(35)   NULL,
    DEPO_KODU     int           NULL,
    BIRIM_AGIRLIK decimal(18, 4) NULL,
    EN            decimal(18, 4) NULL,
    BOY           decimal(18, 4) NULL,
    GENISLIK      decimal(18, 4) NULL,
    SATISKILIT    char(1)       NULL
);
GO

-- GRUP_KODU dogrudan ItemCategory adi olarak ayristirilir (SyncErpItemsCommandHandler
-- .ParseCategory); Box → Koli, Drum → Varil, Pallet → Paletli Urun.
-- EN = Width, BOY = Depth/Length, GENISLIK = Height (hepsi cm).
INSERT INTO dbo.TBLSTSABIT
    (STOK_KODU, STOK_ADI, GRUP_KODU, BARKOD1, DEPO_KODU, BIRIM_AGIRLIK, EN, BOY, GENISLIK, SATISKILIT)
VALUES
    -- Tam olculu normal satirlar
    ('E2E-BOX-001',     'E2E Koli - LED TV',       'Box',    '8690000000011', 1, 12.500,  83.00,  16.00,  52.00, NULL),
    ('E2E-BOX-002',     'E2E Koli - Beyaz Esya',   'Box',    '8690000000028', 1, 34.000,  60.00,  60.00,  85.00, NULL),
    ('E2E-DRUM-001',    'E2E Varil - Kimyasal',    'Drum',   '8690000000035', 2, 180.000, 58.00,  58.00,  88.00, NULL),
    ('E2E-PALLET-001',  'E2E Palet - Karisik Yuk', 'Pallet', '8690000000042', 3, 250.000, 120.00, 100.00, 14.00, NULL),
    -- Olcu ve agirligi eksik satir: SQL'de elenmez, 'eksik alan' isaretiyle taslaga duser
    ('E2E-MISSING-001', 'E2E Olcusu Eksik Parca',  'Box',    NULL,            1, 0.000,   0.00,   0.00,   0.00,  NULL),
    -- Satisa kapali satir: hic cekilmez, yalnizca eleme sayiminda gorunur
    ('E2E-LOCKED-001',  'E2E Satisa Kapali Urun',  'Box',    NULL,            1, 5.000,   30.00,  30.00,  30.00, 'E');
GO

SELECT COUNT(*) AS SeededRowCount FROM dbo.TBLSTSABIT;
GO
