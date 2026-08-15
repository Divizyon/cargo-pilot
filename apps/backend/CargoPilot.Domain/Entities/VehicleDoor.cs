using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

/// <summary>
/// Aracin bir kapisi. Kapilar liste olarak modellenir: bir aracta ayni anda small
/// door ve big door bulunabilir, tekil bir enum bunu ifade edemiyordu
/// (docs/COORDINATE_STANDARD.md §4).
///
/// Kapinin tasidigi tek bilgi tipi ve yuzudur. Yukleme baslangic kosesi bu
/// listeden turetilir (§7): yukleme kapinin bulundugu yuzden baslamaz. Kapinin
/// yaninda birakilan bir "aciklik payi" kavrami yoktur — kutu duvara dayanir,
/// degisen yalnizca hangi duvardan baslandigidir.
/// </summary>
public sealed class VehicleDoor : BaseEntity
{
    public Guid VehicleId { get; private set; }
    public DoorType Type { get; private set; }
    public DoorFace Face { get; private set; }

#pragma warning disable S1144
    public Vehicle? Vehicle { get; private set; }
#pragma warning restore S1144

    private VehicleDoor() { }

    public VehicleDoor(Guid id, Guid vehicleId, DoorType type, DoorFace face) : base(id)
    {
        VehicleId = vehicleId;
        Type = type;
        Face = face;
    }
}
