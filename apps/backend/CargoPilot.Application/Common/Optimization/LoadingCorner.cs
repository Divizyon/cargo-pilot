using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Yukleme baslangic kosesini aracin kapi listesinden turetir
/// (docs/COORDINATE_STANDARD.md §7).
///
/// Kural: yukleme kapinin bulundugu yuzden baslamaz. Kutu kapinin onune
/// yigilirsa operator kendi actigi kapidan iceri giremez, bu yuzden baslangic
/// kosesi kapiya degmeyen kose olur ve doldurma kapiya dogru ilerler.
///
/// Referans kapi her zaman z = length'te oldugu icin z ekseninde yon sabittir:
/// yukleme z = 0'dan baslar. Degisken olan x eksenidir.
/// </summary>
public static class LoadingCorner
{
    /// <summary>
    /// Yukleme <c>x = width</c> tarafindan mi baslasin. Big door yalnizca
    /// <c>x = 0</c> yuzundeyse evet; o yuz kapali oldugu icin karsi kose serbesttir.
    ///
    /// Iki yanda da big door bulunan aracta serbest kose kalmaz. Bu kombinasyon
    /// bugun uretilemez — IX_VehicleDoors_TekKapiTipi her tipten tek kapiya izin
    /// veriyor ve arac formunda da secilemiyor — yani <c>atWidthX</c> kontrolu
    /// ulasilamaz durumda. Yine de birakildi: kural bir geri-uyum yolu degil,
    /// "serbest kose yoksa yon degistirme" karari; kisit gevserse davranis
    /// tanimsiz kalmasin.
    ///
    /// Kapi listesi bos ise <c>null</c> doner: <see cref="HasReferenceDoor"/> ile
    /// ayni semantik. Duz <c>false</c> donseydi kapilari henuz doldurulmamis
    /// arac "yan kapisi yok" saydirilir, oysa dogru cevap "bilinmiyor"dur ve
    /// cagiran taraf tekil alandan turetebilir.
    /// </summary>
    public static bool? FillFromMaxX(ICollection<VehicleDoor>? doors)
    {
        if (doors is null || doors.Count == 0)
            return null;

        var atZeroX = Has(doors, DoorType.Big, DoorFace.ZeroX);
        var atWidthX = Has(doors, DoorType.Big, DoorFace.WidthX);

        return atZeroX && !atWidthX;
    }

    /// <summary>
    /// Aracin referans kapisi (small door, z = length) var mi. LIFO bolge ayrimi
    /// buna bagli. Kapi listesi bos ise null doner: cagiran taraf eski tekil
    /// alandan turetmeye devam eder, boylece kapilari henuz doldurulmamis araclar
    /// bugunku davranisi korur.
    /// </summary>
    public static bool? HasReferenceDoor(ICollection<VehicleDoor>? doors)
        => doors is null || doors.Count == 0
            ? null
            : Has(doors, DoorType.Small, DoorFace.LengthZ);

    private static bool Has(IEnumerable<VehicleDoor> doors, DoorType type, DoorFace face)
        => doors.Any(door => door.Type == type && door.Face == face);
}
