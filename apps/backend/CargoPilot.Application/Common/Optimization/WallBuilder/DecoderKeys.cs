namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Yerlestiricinin plan duzeyindeki kararlari — kutu basina degil, plan basina.
///
/// Bunlar neden aramaya acik: duvar derinligi tercihi olculdu ve SABIT hicbir
/// degeri kazanmadi. Derin duvar BR1'i +1,36 puan yukseltirken BR6'yi 1,45
/// dusuruyor; sig duvar tam tersini yapiyor. Yani dogru deger kutu setine
/// bagli ve tek bir kural olarak yazilamaz. Karar kromozoma tasinir, arama her
/// ornek icin kendi cevabini bulur (ALGORITMA-RULEBOOK.md R-C15a).
/// </summary>
/// <param name="WallDepthPreference">
/// Yeni duvar acilirken derinlik tercihi: <c>-1</c> derin, <c>0</c> yansiz,
/// <c>+1</c> sig. Statik yol daima yansizdir; bugunku davranis budur.
/// </param>
internal readonly record struct DecoderKeys(decimal WallDepthPreference)
{
    /// <summary>Tercihsiz cozum: statik yolun ve tohum bireylerin baslangici.</summary>
    internal static DecoderKeys Neutral => new(0m);

    /// <summary>
    /// <c>[0,1)</c> anahtarini uc yonlu tercihe cevirir. Ucte birlik esit
    /// dilimler: surekli bir agirlik yerine ayrik tercih, cunku olculen sey
    /// "ne kadar derin" degil "derin mi sig mi".
    /// </summary>
    internal static DecoderKeys From(double key)
    {
        if (key < 1d / 3d) return new DecoderKeys(-1m);

        return key < 2d / 3d ? new DecoderKeys(0m) : new DecoderKeys(1m);
    }
}
