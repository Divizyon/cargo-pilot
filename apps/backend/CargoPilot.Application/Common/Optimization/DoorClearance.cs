using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Aracin kapi listesinden motorun okudugu aciklik paylarini (x0) cikarir
/// (docs/COORDINATE_STANDARD.md §7).
///
/// Pay yalnizca big door'da anlamlidir ve her kapi kendi payini tasir; bu yuzden
/// iki yuz ayri ayri okunur. Kapi yoksa pay 0'dir ve kullanilabilir aralik
/// 0..width olarak kalir — motorun kapi listesinden onceki davranisi.
/// </summary>
public static class DoorClearance
{
    public static decimal AtZeroX(IEnumerable<VehicleDoor>? doors) => Find(doors, DoorFace.ZeroX);

    public static decimal AtWidthX(IEnumerable<VehicleDoor>? doors) => Find(doors, DoorFace.WidthX);

    private static decimal Find(IEnumerable<VehicleDoor>? doors, DoorFace face)
        => doors?.FirstOrDefault(door => door.Type == DoorType.Big && door.Face == face)?.ClearanceCm ?? 0m;
}
