using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles;

/// <summary>
/// Aracin bir kapisi (docs/COORDINATE_STANDARD.md §4). Kapilar liste olarak
/// tasinir: bir aracta ayni anda small door ve iki big door bulunabilir.
/// </summary>
/// <param name="Type">Kapi tipi: small / big / top.</param>
/// <param name="Face">Kapinin bulundugu yuz, eksen degeriyle.</param>
public sealed record VehicleDoorDto(DoorType Type, DoorFace Face)
{
    public static VehicleDoorDto FromEntity(VehicleDoor door) => new(door.Type, door.Face);
}
