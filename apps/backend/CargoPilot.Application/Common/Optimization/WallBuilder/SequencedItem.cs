using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Yerlestirme sirasindaki bir kutu ve arama katmaninin onun icin tercih ettigi
/// yonelim.
///
/// Yonelim neden sirayla birlikte tasiniyor: duvarin derinligini kutunun HANGI
/// kenarinin z eksenine geldigi belirler. Sira aramaya acikken yonelim sabit
/// kalirsa, arama duvar derinligini hic kontrol edemez — bir kutunun 40 mi 160 cm
/// mi derinlik acacagi rastgele kalir (docs/algorithm/01-kurallar.md R-C15).
/// </summary>
/// <param name="Item">Yerlestirilecek kutu.</param>
/// <param name="OrientationKey">
/// <c>[0,1)</c> araliginda tercih anahtari; izinli yonelim listesinde bir
/// baslangic noktasina cevrilir. Negatif deger "tercih yok" demektir ve tarama
/// listenin basindan baslar — statik yolun bugunku davranisi.
/// </param>
internal readonly record struct SequencedItem(OptimizationItemInput Item, double OrientationKey)
{
    internal const double NoPreference = -1d;

    internal static SequencedItem Plain(OptimizationItemInput item) => new(item, NoPreference);
}
