using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Istemci sequencer belirtmediginde hangisinin kosacagi. Tek yerde durur cunku
/// iki komut (plan olustur, yeniden optimize et) ayni cevabi vermek zorunda.
/// </summary>
internal static class SequencerSelection
{
    /// <summary>
    /// Belirtilmeyen sequencer'i cozer. Duvar orucu icin varsayilan GRASP'tir
    /// (`DR-13`): 700 ornekli BR1-BR7 olcumu GWCA'nin her eksende kaybettigini
    /// gosterdi ve arama katmani doluluğu %79,86'dan %85,32'ye cikariyor —
    /// istemcinin bunu ayrica istemesi gerekmemeli.
    ///
    /// Greedy icin cevap <see cref="SequencerKind.Static"/> kalir; greedy zaten
    /// sequencer okumaz ve bugunku 17 golden snapshot aynen korunur (`DR-01`).
    /// </summary>
    internal static SequencerKind Resolve(PlacementStrategy strategy, SequencerKind? requested)
    {
        if (requested.HasValue) return requested.Value;

        return strategy == PlacementStrategy.WallBuilder ? SequencerKind.Grasp : SequencerKind.Static;
    }
}
