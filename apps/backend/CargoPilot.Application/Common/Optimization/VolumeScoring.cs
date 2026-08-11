using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Hacim (sıkı paketleme) skor terimleri: aday pozisyonu kamyonun derinlik ve
/// genişlik eksenlerinde köşeye doğru iter, böylece boşluk arkada değil önde
/// birikir. Motordan çıkarılan saf fonksiyonlardır; durum tutmaz.
///
/// Modül WeightBalance kriterinde kapalıdır (terim 0); VolumeFirst ve Lifo aynı
/// derinlik/genişlik ifadelerini paylaşır.
///
/// Tasarım kararı: hepsi <c>static</c>. Sıcak döngüde her aday pozisyon ×
/// yönelim için çağrıldıklarından sanal çağrı bilinçli olarak kullanılmaz.
/// </summary>
internal static class VolumeScoring
{
    // Kalibre edilmiş katsayı: derinlik, genişlikten 1000 kat baskındır; böylece
    // aynı kattaki adaylar önce Z'ye, eşitlikte X'e göre seçilir.
    private const decimal DepthCoefficient = 1_000m;

    /// <summary>Derinlik terimi: küçük Z (kapıya yakın) tercih edilir.</summary>
    internal static decimal DepthTerm(LoadingPlanOptimizationCriteria criteria, decimal ez)
        => IsEnabled(criteria) ? ez * DepthCoefficient : 0m;

    /// <summary>Genişlik terimi: eşit puanlı adaylar arasında küçük X tercih edilir.</summary>
    internal static decimal WidthTerm(LoadingPlanOptimizationCriteria criteria, decimal ex)
        => IsEnabled(criteria) ? ex : 0m;

    // WeightBalance yalnızca yerçekimi ve dengeye bakar; Z/X tercihi yoktur.
    private static bool IsEnabled(LoadingPlanOptimizationCriteria criteria)
        => criteria != LoadingPlanOptimizationCriteria.WeightBalance;
}
