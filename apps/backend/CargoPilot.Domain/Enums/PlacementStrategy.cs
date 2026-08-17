namespace CargoPilot.Domain.Enums;

/// <summary>
/// Yerlestiricinin secimi. Greedy bugunku motordur ve varsayilandir;
/// WallBuilder duvar tabanli yerlestiricidir (ALGORITMA-RULEBOOK.md R-C07/DR-01).
/// Iki yol yan yana durur, biri digerinin yerine gecmez.
/// </summary>
public enum PlacementStrategy
{
    Greedy = 0,
    WallBuilder = 1
}
