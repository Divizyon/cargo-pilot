using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Istemci sequencer belirtmediginde hangisinin kosacagi. Tek yerde durur cunku
/// iki komut (plan olustur, yeniden optimize et) ayni cevabi vermek zorunda.
/// </summary>
internal static class SequencerSelection
{
    /// <summary>
    /// Belirtilmeyen sequencer ILERI BAKISLI ISIN ARAMASINA cozulur
    /// (`DR-24` → `DR-56`). Ayni butcede olculdu, 175 ornek:
    ///
    ///   GRASP  %88,34
    ///   Beam   %89,42   (+1,08; YEDI KUMENIN YEDISINDE de onde)
    ///
    /// Fark karar biriminden gelir. GRASP tum plani tek bir permutasyonla
    /// belirleyip onu rastgele bozup duzeltir; beam her parcada o ana kadarki
    /// duruma bakarak karar verir ve karari sonuna kadar goturup olcer. Ayni
    /// butcede ikincisi daha bilgili.
    ///
    /// Cozum YALNIZ burada, yani komut isleyicilerinde yapilir. Motoru dogrudan
    /// cagiran yollar (golden snapshot'lar, degismez testleri, doluluk kapisi)
    /// <c>OptimizationInput.Sequencer</c> varsayilanini alir ve o Static'tir:
    /// saf hesap, makineden bagimsiz, bayt kararli. Beam'in butcesi de duvar
    /// saatidir — GRASP'takiyle ayni kisit — bu yuzden ayrim korunmak zorunda.
    ///
    /// GRASP silinmedi: <c>SequencerKind.Grasp</c> acikca istenebilir ve kiyas
    /// referansi olarak duruyor.
    /// </summary>
    internal static SequencerKind Resolve(SequencerKind? requested) => requested ?? SequencerKind.Beam;
}
