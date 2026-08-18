namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Yerlestiricinin plan duzeyindeki kararlari — kutu basina degil, plan basina.
///
/// Bunlar neden aramaya acik: her ikisi de olculdu ve SABIT hicbir degeri
/// kazanmadi, cunku dogru cevap kutu setine bagli.
///
/// Duvar derinligi: derin duvar BR1'i +1,36 puan yukseltirken BR6'yi 1,45
/// dusuruyor, sig duvar tam tersini yapiyor.
///
/// Cep sirasi: cebi yeni duvardan ONCE denemek BR'de +0,23 getiriyor ama
/// giyotin korpusunda 3,38 puan kaybettiriyor. Ikisi de gercek yuk bicimleri —
/// tamamen tekrarli bir sevkiyat BR'ye, karisik tek parca bir yuk giyotine
/// benzer — dolayisiyla birini secmek otekini feda etmek olurdu.
///
/// Karar kromozoma tasinir, arama her ornek icin kendi cevabini bulur
/// (docs/algorithm/01-kurallar.md R-C15a).
/// </summary>
/// <param name="WallDepthPreference">
/// Yeni duvar acilirken derinlik tercihi: <c>-1</c> derin, <c>0</c> yansiz,
/// <c>+1</c> sig.
/// </param>
/// <param name="PocketBeforeNewWall">
/// Mevcut duvarlara sigmayan kutu icin sira: <c>true</c> ise once bant disi
/// cepler taranir, sonra yeni duvar acilir; <c>false</c> ise tersi.
/// </param>
internal readonly record struct DecoderKeys(decimal WallDepthPreference, bool PocketBeforeNewWall)
{
    /// <summary>Kromozomda decoder icin ayrilan gen sayisi.</summary>
    internal const int GeneCount = 4;

    /// <summary>
    /// Statik yolun ve tohum bireylerin baslangici: bugunku davranis. Arama
    /// sapmayi kendisi kesfetmeli (R-C21), yoksa tohumlar bugunku ciktiyi
    /// temsil etmezdi.
    /// </summary>
    internal static DecoderKeys Neutral => new(0m, false);

    /// <summary>Tohum bireyin gen degerleri; <see cref="Neutral"/> ile ayni anlama gelir.</summary>
    internal static double SeedGene(int index) => index == 1 ? 0d : 0.5d;

    /// <summary>
    /// Gen blogunu tercihlere cevirir. Duvar derinligi ucte birlik esit
    /// dilimlere bolunur: surekli bir agirlik yerine ayrik tercih, cunku olculen
    /// sey "ne kadar derin" degil "derin mi sig mi".
    /// </summary>
    internal static DecoderKeys From(double[] keys, int offset)
    {
        ArgumentNullException.ThrowIfNull(keys);

        return new DecoderKeys(DepthOf(keys[offset]), keys[offset + 1] >= 0.5d);
    }

    private static decimal DepthOf(double key)
    {
        if (key < 1d / 3d) return -1m;

        return key < 2d / 3d ? 0m : 1m;
    }
}
