namespace CargoPilot.Application.Common.Items;

/// <summary>
/// Yuk gruplari ve gruplar arasi istif uyumsuzlugu. Grup adlari ve eslesmeler
/// frontend'deki <c>LOAD_GROUPS</c> / <c>INCOMPATIBLE_BY_GROUP</c> ile birebir aynidir
/// (apps/frontend/src/lib/config/item-import-columns.ts, lib/api/itemMappers.ts);
/// iki taraf ayrisirsa taslak onayi ile ekran farkli uyumsuzluk uretir.
/// </summary>
public static class LoadGroups
{
    public const string Chemical = "Kimya";
    public const string Hazardous = "Tehlikeli Madde";
    public const string Food = "Gıda";
    public const string Electronics = "Elektronik";
    public const string Textile = "Tekstil";

    /// <summary>Eslesme bulunamadiginda kullanilan varsayilan grup.</summary>
    public const string General = "Genel";

    private static readonly Dictionary<string, string[]> _incompatibleByGroup = new(StringComparer.Ordinal)
    {
        [Chemical] = [Food, Electronics, Textile],
        [Hazardous] = [Food, General, Textile],
        [Food] = [Chemical, Hazardous],
        [Electronics] = [Chemical, Hazardous],
        [Textile] = [Chemical, Hazardous],
        [General] = [Hazardous],
    };

    /// <summary>
    /// Gruba karsilik gelen uyumsuz grup listesi. Bilinen her grup icin bos olmayan bir
    /// dizi doner; taslak onayindaki <c>IncompatibleGroups NotEmpty</c> kurali bu sayede
    /// kullanici hic dokunmadan da saglanir.
    /// </summary>
    public static string[] IncompatibleWith(string? stackGroup)
    {
        if (stackGroup is null)
            return [];

        return _incompatibleByGroup.TryGetValue(stackGroup, out var groups) ? [.. groups] : [];
    }
}
