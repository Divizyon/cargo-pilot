namespace CargoPilot.Domain.Enums;

/// <summary>
/// Kutu sirasini ureten katman. Static bugunku kriter tabanli siralamadir
/// (ItemOrdering) ve varsayilandir; digerleri Wall-Builder uzerinde kiyaslanan
/// meta-sezgisellerdir (ALGORITMA-RULEBOOK.md R-C22/DR-03).
/// </summary>
public enum SequencerKind
{
    Static = 0,
    Gwca = 1,
    Ga = 2,
    Grasp = 3
}
