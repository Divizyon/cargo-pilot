using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

/// <summary>
/// Aracin bir kapisi. Kapilar liste olarak modellenir: bir aracta ayni anda small
/// door ve iki big door bulunabilir, tekil bir enum bunu ifade edemiyordu
/// (docs/COORDINATE_STANDARD.md §4).
/// </summary>
public sealed class VehicleDoor : BaseEntity
{
    public Guid VehicleId { get; private set; }
    public DoorType Type { get; private set; }
    public DoorFace Face { get; private set; }

    /// <summary>
    /// Big door'un aciklik payi (x0), santimetre. Yalnizca big door icin anlamlidir:
    /// kanat kalinligi araca gore degistigi icin sistem sabiti degil, arac kaydinin
    /// alanidir (docs/COORDINATE_STANDARD.md §7). Girilmemisse 0 kabul edilir ve
    /// yukleme duvardan baslar.
    /// </summary>
    public decimal ClearanceCm { get; private set; }

#pragma warning disable S1144
    public Vehicle? Vehicle { get; private set; }
#pragma warning restore S1144

    private VehicleDoor() { }

    public VehicleDoor(Guid id, Guid vehicleId, DoorType type, DoorFace face, decimal clearanceCm = 0m)
        : base(id)
    {
        if (clearanceCm < 0m)
            throw new ArgumentOutOfRangeException(nameof(clearanceCm), "Kapi aciklik payi negatif olamaz.");

        // Aciklik payi yalnizca big door'da yuklemeyi kaydirir; digerlerinde tasinmasi
        // sessiz bir yanlis okumaya yol acardi.
        if (type != DoorType.Big && clearanceCm > 0m)
            throw new ArgumentException("Aciklik payi yalnizca big door icin tanimlanir.", nameof(clearanceCm));

        VehicleId = vehicleId;
        Type = type;
        Face = face;
        ClearanceCm = clearanceCm;
    }
}
