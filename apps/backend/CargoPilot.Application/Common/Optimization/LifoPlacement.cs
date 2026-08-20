namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// LIFO (son giren ilk çıkar) yön semantiği. Motordan çıkarılan saf bir
/// fonksiyondur; durum tutmaz, sıra bağımlılığı yoktur.
///
/// BÖLGE (zone) modeli kaldırıldı (docs/algorithm/02-kararlar.md DR-67).
/// LIFO'nun uzaysal kuralı artık bant değil ÇIKARILABİLİRLİK'tir ve tek
/// noktada, sert kapı olarak <see cref="PlacementValidator.ViolatesUnloadPath"/>
/// içinde uygulanır. Bölge hesabı üretimde çağrılmıyordu; ölü dal olarak
/// bırakmak okuyanı var olmayan bir kurala inandırıyordu.
///
/// Modülün açık/kapalı olması <see cref="Models.OptimizationModules.UseLifo"/>
/// ile belirlenir; varsayılan türetme yalnızca Lifo kriterinde açıktır.
///
/// Tasarım kararı: <c>static</c>. Sıcak döngüde çağrıldığı için
/// arayüz/delegate/DI üzerinden sanal çağrı bilinçli olarak kullanılmaz.
/// </summary>
internal static class LifoPlacement
{
    /// <summary>
    /// Yükleme sırası karşılaştırması. Yüksek UnloadingOrder = en son inecek grup =
    /// önce yüklenir = uzak yüz (z = 0) tarafı.
    ///
    /// Aynı yön semantiğini paylaşan üç nokta:
    /// (1) <see cref="ItemOrdering.SortForGroupPlacement"/> — grup sıralaması (DESC),
    /// (2) <see cref="PlacementValidator.ViolatesStackability"/> — dikey istif kuralı,
    /// (3) <see cref="PlacementValidator.ViolatesUnloadPath"/> — çıkarılabilirlik.
    /// </summary>
    internal static int CompareUnloadingOrder(int a, int b) => a.CompareTo(b);
}
