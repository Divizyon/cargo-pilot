namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Bir ERP satirinin taslaga yazilmama nedeni. Muhasebedeki tek eleme sozlugu budur;
/// sayaci olmayan eleme yolu birakilmaz.
/// </summary>
/// <remarks>
/// Eksik/sifir olcu ve agirlik bir eleme nedeni DEGILDIR: bu satirlar
/// <see cref="ErpProductDto.MissingFields"/> isaretiyle taslaga duser ve kullanici
/// tarafindan tamamlanir.
/// </remarks>
public enum ErpDropReason
{
    /// <summary>SATISKILIT = 'E': satis kilitli urun kaynakta hic cekilmez.</summary>
    SalesLocked,

    /// <summary>Kullanicinin sectigi kategori filtresinin disinda kaldi (bilgi, sorun degil).</summary>
    CategoryFiltered,

    /// <summary>Kullanicinin sectigi depo filtresinin disinda kaldi (bilgi, sorun degil).</summary>
    WarehouseFiltered,

    /// <summary>Tek sync satir limiti asildi; kalan satirlar bu sync'e alinmadi.</summary>
    RowLimitExceeded,

    /// <summary>Ayni ERP kaydi ayni partide tekrar geldi; yalnizca ilki islenir.</summary>
    DuplicateErpId,
}
