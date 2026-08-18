namespace CargoPilot.Domain.Enums;

/// <summary>
/// Kutu sirasini ureten katman. Static bugunku kriter tabanli siralamadir
/// (ItemOrdering) ve varsayilandir; digerleri Wall-Builder uzerinde kiyaslanan
/// meta-sezgisellerdir (docs/algorithm/01-kurallar.md R-C22 + 02-kararlar.md DR-03).
/// </summary>
public enum SequencerKind
{
    Static = 0,
    Gwca = 1,
    Ga = 2,
    Grasp = 3,

    /// <summary>Ileri bakisli isin aramasi (F7-4); plani parca parca kurar.</summary>
    Beam = 4
}
