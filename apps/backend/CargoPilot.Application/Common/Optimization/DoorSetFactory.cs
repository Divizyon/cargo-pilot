using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Tekil <c>LoadingType</c> degerinden kapi listesi turetir. Gecis suresince iki
/// model yan yana durur: istemci kapi listesi gondermiyorsa liste eski alandan
/// uretilir, boylece kapi tablosu bos kalmaz.
///
/// Cevrim sadiktir, kapi uydurmaz: eski enum "hangi kapidan yukleniyor" sorusunu
/// yanitliyordu, "aracta hangi kapilar var" sorusunu degil. SideRight kaydina bir
/// de small door eklemek olmayan bir kapiyi varsaymak olurdu. Ayni cevrim
/// VehicleDoorsTablosuEklendi migration'inin backfill'inde de kullanildi.
/// </summary>
public static class DoorSetFactory
{
    public static IReadOnlyList<(DoorType Type, DoorFace Face)> FromLoadingType(LoadingType loadingType)
        => loadingType switch
        {
            LoadingType.Rear      => [(DoorType.Small, DoorFace.LengthZ)],
            LoadingType.SideRight => [(DoorType.Big, DoorFace.WidthX)],
            LoadingType.SideLeft  => [(DoorType.Big, DoorFace.ZeroX)],
            LoadingType.SideBoth  => [(DoorType.Big, DoorFace.ZeroX), (DoorType.Big, DoorFace.WidthX)],
            LoadingType.Top       => [(DoorType.Top, DoorFace.HeightY)],
            _                     => [],
        };

    /// <summary>Araca kapilarini yazar; liste zaten doluysa dokunmaz.</summary>
    public static void EnsureDoors(Vehicle vehicle)
    {
        if (vehicle.Doors.Count > 0)
            return;

        foreach (var (type, face) in FromLoadingType(vehicle.LoadingType))
            vehicle.Doors.Add(new VehicleDoor(Guid.NewGuid(), vehicle.Id, type, face));
    }
}
