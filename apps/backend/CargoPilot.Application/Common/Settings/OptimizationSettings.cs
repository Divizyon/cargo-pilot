namespace CargoPilot.Application.Common.Settings;

/// <summary>
/// Yerlestirme motorunun ozellik anahtarlari (appsettings: "Optimization").
/// </summary>
/// <remarks>
/// <see cref="EnableExperimentalStrategies"/> varsayilan KAPALI'dir: Greedy disindaki
/// yerlestiriciler ve Static disindaki sequencer'lar kalibre edilmemis deneysel
/// yollardir (ALGORITMA-RULEBOOK.md DR-03). Kapaliyken istek sessizce Greedy'ye
/// dusurulmez, 400 ile reddedilir; boylece istemci hangi yolun kostugunu bilir.
/// </remarks>
public sealed class OptimizationSettings
{
    public bool EnableExperimentalStrategies { get; set; }
}
