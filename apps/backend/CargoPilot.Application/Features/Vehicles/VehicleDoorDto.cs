using System.Text.Json.Serialization;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles;

/// <summary>
/// Aracin bir kapisi (docs/COORDINATE_STANDARD.md §4). Kapilar liste olarak
/// tasinir: bir aracta her tipten en fazla bir kapi bulunabilir (VehicleDoorRules).
/// </summary>
/// <param name="Type">Kapi tipi: small / big / top.</param>
/// <param name="Face">Kapinin bulundugu yuz, eksen degeriyle.</param>
/// <remarks>
/// Enum'lar tel uzerinde metindir. Sayisal deger olsaydi enum sirasi degistiginde
/// istemci sessizce baska bir yuze isaret ederdi; ayni gerekce veritabaninda da
/// metin saklamayi getirdi (VehicleDoorConfiguration).
/// </remarks>
public sealed record VehicleDoorDto(
    [property: JsonConverter(typeof(JsonStringEnumConverter))] DoorType Type,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] DoorFace Face)
{
    public static VehicleDoorDto FromEntity(VehicleDoor door) => new(door.Type, door.Face);
}
