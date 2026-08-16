namespace CargoPilot.Domain.Enums;

/// <summary>
/// Kapi tipi boyuta gore siniflanir, yone gore degil
/// (docs/COORDINATE_STANDARD.md §4). "on kapi" / "sag kapi" diye bir kavram yoktur.
/// </summary>
public enum DoorType
{
    /// <summary>Kisa yuzde, <c>width x height</c>. TIR'da back door.</summary>
    Small = 0,

    /// <summary>Uzun yan yuzde, <c>length x height</c>.</summary>
    Big = 1,

    /// <summary>Tavanda, <c>width x length</c>.</summary>
    Top = 2
}

/// <summary>
/// Kapinin bulundugu yuz, eksen degeriyle yazilir. Yon adlandirmasi
/// (on/arka/sag/sol) kullanilmaz; "sag" ve "sol" yalnizca kamera bakislarinin adidir.
/// </summary>
public enum DoorFace
{
    // Uzak yuz (z = 0) bilincli olarak yoktur: hicbir kapi tipi orada
    // bulunamaz (TIR'da kabin ucudur ve yukleme her zaman oradan baslar,
    // docs/COORDINATE_STANDARD.md §7). Enum'da tanimliyken hicbir tiple
    // eslesmedigi icin her istekte 400 uretiyordu.

    /// <summary>Referans kapi yuzu.</summary>
    LengthZ = 1,

    /// <summary>Origin'in bulundugu uzun yan yuz.</summary>
    ZeroX = 2,

    /// <summary>Karsi uzun yan yuz.</summary>
    WidthX = 3,

    /// <summary>Tavan.</summary>
    HeightY = 4
}
