namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Hacim (siki paketleme) skor terimleri: aday pozisyonu yukleme baslangic
/// kosesine dogru iter, boylece bosluk kapi tarafinda birikir. Motordan
/// cikarilan saf fonksiyonlardir; durum tutmaz.
///
/// Modulun acik/kapali olmasi <see cref="Models.OptimizationModules.UseVolume"/>
/// ile belirlenir; varsayilan turetme WeightBalance kriterinde kapalidir (terim
/// 0), VolumeFirst ve Lifo ise ayni ifadeleri paylasir.
///
/// Tasarim karari: hepsi <c>static</c>. Sicak dongude her aday pozisyon x
/// yonelim icin cagrildiklarindan sanal cagri bilincli olarak kullanilmaz.
/// </summary>
internal static class VolumeScoring
{
    // Kalibre edilmis katsayi: uzunluk, genislikten 1000 kat baskindir; boylece
    // ayni kattaki adaylar once Z'ye, esitlikte X'e gore secilir.
    private const decimal LengthCoefficient = 1_000m;

    /// <summary>
    /// Uzunluk terimi: kucuk Z tercih edilir. Referans kapi <c>z = length</c>'te
    /// oldugu icin yukleme uzak yuzden baslar ve kapiya dogru ilerler.
    /// </summary>
    internal static decimal LengthTerm(bool enabled, decimal ez)
        => enabled ? ez * LengthCoefficient : 0m;

    /// <summary>
    /// Genislik terimi: esit puanli adaylar arasinda yukleme baslangic kosesine
    /// yakin olan tercih edilir.
    ///
    /// Yon kapiya gore doner: big door <c>x = 0</c> yuzundeyse yukleme
    /// <c>x = width</c> tarafindan baslar ve kapiya dogru ilerler, yani buyuk X
    /// tercih edilir. Kapinin oldugu yuzden yukleme baslamaz — kutu kapinin
    /// onune yigilirsa operator kendi actigi kapidan iceri giremez.
    /// </summary>
    /// <param name="enabled">Hacim modulu acik mi.</param>
    /// <param name="ex">Kutunun origin'e en yakin kosesinin x'i (min x).</param>
    /// <param name="boxWidth">
    /// Kutunun yerlesim genisligi. Aynalanmis modda mesafe kutunun SAG kenarindan
    /// olculur; <c>ex</c> min kose oldugu icin genislik eklenmezse terim ayni
    /// noktada duran genis ve dar kutulara farkli puan verir ve secim yonelime
    /// bagli hale gelirdi.
    /// </param>
    /// <param name="vehicleWidth">Aracin ic genisligi.</param>
    /// <param name="fillFromMaxX">Yukleme x = width tarafindan mi basliyor.</param>
    internal static decimal WidthTerm(
        bool enabled, decimal ex, decimal boxWidth, decimal vehicleWidth, bool fillFromMaxX)
    {
        if (!enabled)
            return 0m;

        return fillFromMaxX ? vehicleWidth - (ex + boxWidth) : ex;
    }
}
