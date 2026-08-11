namespace CargoPilot.Application.Common.Settings;

/// <summary>
/// Plan onayi -> ERP aktarimi ozellik anahtari (appsettings: "Erp").
/// Gercek aktarim (ERP-18) tamamlanana kadar varsayilan KAPALI; kapaliyken
/// plan onayi ERP durumuna hic dokunmaz ve is kuyruguna kayit atilmaz.
/// </summary>
public sealed class ErpExportSettings
{
    public bool ExportEnabled { get; set; }
}
