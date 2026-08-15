namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Hacim (sıkı paketleme) skor terimleri: aday pozisyonu kamyonun derinlik ve
/// genişlik eksenlerinde köşeye doğru iter, böylece boşluk arkada değil önde
/// birikir. Motordan çıkarılan saf fonksiyonlardır; durum tutmaz.
///
/// Modülün açık/kapalı olması <see cref="Models.OptimizationModules.UseVolume"/>
/// ile belirlenir; varsayılan türetme WeightBalance kriterinde kapalıdır (terim
/// 0), VolumeFirst ve Lifo ise aynı derinlik/genişlik ifadelerini paylaşır.
///
/// Tasarım kararı: hepsi <c>static</c>. Sıcak döngüde her aday pozisyon ×
/// yönelim için çağrıldıklarından sanal çağrı bilinçli olarak kullanılmaz.
/// </summary>
internal static class VolumeScoring
{
    // Kalibre edilmiş katsayı: derinlik, genişlikten 1000 kat baskındır; böylece
    // aynı kattaki adaylar önce Z'ye, eşitlikte X'e göre seçilir.
    private const decimal LengthCoefficient = 1_000m;

    /// <summary>Derinlik terimi: küçük Z (kapıya yakın) tercih edilir.</summary>
    internal static decimal LengthTerm(bool enabled, decimal ez)
        => enabled ? ez * LengthCoefficient : 0m;

    /// <summary>Genişlik terimi: eşit puanlı adaylar arasında küçük X tercih edilir.</summary>
    internal static decimal WidthTerm(bool enabled, decimal ex)
        => enabled ? ex : 0m;
}
