namespace CargoPilot.Application.Common.Settings;

/// <summary>
/// Plan onayi -> ERP aktarimi ozellik anahtari ve siparis yazim sabitleri
/// (appsettings: "Erp").
/// </summary>
/// <remarks>
/// <see cref="ExportEnabled"/> varsayilan KAPALI'dir: asagidaki sema sabitleri Netsis
/// standart siparis tablolari (TBLSIPAMAS/TBLSIPATRA) icin yazilmistir ama musterinin
/// kendi Netsis kurulumunda (fis tipi, sube/isletme kodu, depo) dogrulanmadan aktarim
/// acilmamalidir. Bkz. docs/erp-integration/erp-export-kontrati.md.
/// </remarks>
public sealed class ErpExportSettings
{
    public bool ExportEnabled { get; set; }

    /// <summary>TBLSIPAMAS.CARI_KODU — siparisin yazilacagi cari. Bos ise aktarim yapilmaz.</summary>
    public string? CustomerCode { get; set; }

    /// <summary>Siparis numarasi oneki (TBLSIPAMAS.FATIRS_NO); plan kimligiyle birlestirilir.</summary>
    public string OrderNumberPrefix { get; set; } = "CP";

    /// <summary>TBLSIPAMAS.SUBE_KODU / TBLSIPATRA.SUBE_KODU.</summary>
    public int BranchCode { get; set; }

    /// <summary>TBLSIPAMAS.ISLETME_KODU.</summary>
    public int BusinessCode { get; set; }

    /// <summary>TBLSIPATRA.DEPO_KODU — sevkiyatin cikacagi depo.</summary>
    public int WarehouseCode { get; set; }

    /// <summary>TBLSIPAMAS.FTIRSIP ve TBLSIPATRA.STHAR_FTIRSIP fis tipi.</summary>
    public string DocumentType { get; set; } = "6";

    /// <summary>TBLSIPATRA.STHAR_GCKOD — giris/cikis kodu; sevkiyat siparisi cikistir.</summary>
    public string LineDirection { get; set; } = "C";

    /// <summary>TBLSIPATRA.STHAR_HTUR — hareket turu.</summary>
    public string LineMovementType { get; set; } = "S";
}
