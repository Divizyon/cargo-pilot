using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Istemci sequencer belirtmediginde hangisinin kosacagi. Tek yerde durur cunku
/// iki komut (plan olustur, yeniden optimize et) ayni cevabi vermek zorunda.
/// </summary>
internal static class SequencerSelection
{
    /// <summary>
    /// Belirtilmeyen sequencer GRASP'a cozulur (`DR-13`, `DR-24`): 700 ornekli
    /// BR1-BR7 olcumu arama katmaninin dolulugu %80,09'dan %86,23'e cikardigini
    /// gosterdi ve istemcinin bunu ayrica istemesi gerekmemeli.
    ///
    /// Cozum YALNIZ burada, yani komut isleyicilerinde yapilir. Motoru dogrudan
    /// cagiran yollar (golden snapshot'lar, degismez testleri, doluluk kapisi)
    /// <c>OptimizationInput.Sequencer</c> varsayilanini alir ve o Static'tir:
    /// saf hesap, makineden bagimsiz, bayt kararli. GRASP'in butcesi duvar saati
    /// oldugu icin bu ayrim korunmak zorunda.
    /// </summary>
    internal static SequencerKind Resolve(SequencerKind? requested) => requested ?? SequencerKind.Grasp;
}
