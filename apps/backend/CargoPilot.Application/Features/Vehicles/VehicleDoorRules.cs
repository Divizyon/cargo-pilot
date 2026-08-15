using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles;

/// <summary>
/// Kapi listesinin gecerlilik kurallari (docs/COORDINATE_STANDARD.md §4, §7).
/// Ayni kurallar veritabaninda CK_VehicleDoors_TipYuzEslesmesi ve
/// IX_VehicleDoors_TekKapiTipi ile de zorlanir; burasi kullaniciya okunur bir
/// hata dondurmek icindir, son savunma hatti degil.
/// </summary>
public static class VehicleDoorRules {
    /// <summary>Her kapi tipinin bulunabilecegi yuzler.</summary>
    public static IReadOnlyList<DoorFace> AllowedFaces(DoorType type) => type switch {
        DoorType.Small => [DoorFace.LengthZ],
        DoorType.Big   => [DoorFace.ZeroX, DoorFace.WidthX],
        DoorType.Top   => [DoorFace.HeightY],
        _              => [],
    };

    /// <summary>
    /// Listeyi dogrular; sorun varsa kullaniciya gosterilecek mesaji, yoksa
    /// <c>null</c> dondurur.
    /// </summary>
    public static string? Validate(IReadOnlyList<(DoorType Type, DoorFace Face)> doors) {
        // Kapisiz arac yuklenemez: yukun girecegi bir acikligi yoktur.
        if (doors.Count == 0)
            return "Araçta en az bir kapı bulunmalıdır.";

        // Ayni tipten iki kapi, ilgili eksende serbest kose birakmaz ve
        // yuklemenin baslayacagi nokta bulunamaz (§7).
        var duplicate = doors
            .GroupBy(door => door.Type)
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            return $"Aynı tipten birden fazla kapı tanımlanamaz: {DoorTypeLabel(duplicate.Key)}.";

        foreach (var (type, face) in doors) {
            if (!AllowedFaces(type).Contains(face))
                return $"{DoorTypeLabel(type)} bu yüze yerleştirilemez.";
        }

        return null;
    }

    private static string DoorTypeLabel(DoorType type) => type switch {
        DoorType.Small => "arka kapı",
        DoorType.Big   => "yan kapı",
        DoorType.Top   => "üst kapı",
        _              => "kapı",
    };
}
