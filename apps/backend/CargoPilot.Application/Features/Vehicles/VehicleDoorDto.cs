using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles;

/// <summary>
/// Aracin bir kapisi (docs/COORDINATE_STANDARD.md §4). Kapilar liste olarak
/// tasinir: bir aracta ayni anda small door ve iki big door bulunabilir.
/// </summary>
/// <param name="Type">Kapi tipi: small / big / top.</param>
/// <param name="Face">Kapinin bulundugu yuz, eksen degeriyle.</param>
/// <param name="ClearanceCm">
/// Big door aciklik payi (x0, cm). Yalnizca big door icin anlamlidir; digerlerinde 0.
/// </param>
public sealed record VehicleDoorDto(DoorType Type, DoorFace Face, decimal ClearanceCm)
{
    public static VehicleDoorDto FromEntity(VehicleDoor door)
        => new(door.Type, door.Face, door.ClearanceCm);
}
