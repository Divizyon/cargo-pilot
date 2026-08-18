namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Aday degerlendirme fonksiyonu — VCS (Araya, Guerrero &amp; Nunez 2017).
///
/// Bugunku aday secimi <c>OrientationFit</c> ile SOZLUKBILIMSELDIR: once
/// yercekimi, esitlikse duvar derinligi, esitlikse blok, esitlikse artik...
/// Her anahtar bir oncekini asla deviremez. VCS ise AGIRLIKLI CARPIMDIR: dort
/// terim birbirini dengeler, biri otekini devirebilir.
///
///     deger = hacim^delta x (1 - kayip)^beta x temas^alpha x (1 / kutu)^gamma
///
/// Terimlerin okunusu:
///   HACIM  — buyuk blok iyidir; asil amac zaten hacim doldurmak.
///   KAYIP  — blogu koyduktan sonra bosluktan geriye kalan ve BIR DAHA
///            kullanilamayacak hacim. Buyuk blok cok hacim doldurup arkasinda
///            kullanilamaz bir dilim birakiyorsa iyi bir aday degildir.
///   TEMAS  — komsu kutulara ve arac yuzeylerine degen alan. Cok temas eden
///            yerlesim kati platform uretir; bu, DR-44'un olctugu "duvar yuzu
///            dosenmiyor" sorununun dogrudan karsiligidir.
///   KUTU   — ayni hacmi AZ kutuyla doldurmak yeglenir: az kutu, az arayuz,
///            az parcalanma.
///
/// USTELLER OLCULMEDI. Kaynakta fonksiyonun BICIMI var, katsayilari yok;
/// elimizdeki inceleme de vermiyor. Bu yuzden dordu de <c>1</c> ile baslar —
/// notr bir baslangic, kalibre edilmis bir deger degil. Kalibrasyon F7-4'un
/// isidir ve o zamana kadar buradaki sayilar bir TAHMINDIR.
/// </summary>
internal static class BlockValue
{
    /// <summary>Ustellerin notr baslangici; hicbiri olculmedi.</summary>
    internal readonly record struct Weights(double Volume, double Waste, double Contact, double BoxCount)
    {
        /// <summary>Dort terim de esit agirlikta.</summary>
        internal static Weights Neutral => new(1d, 1d, 1d, 1d);
    }

    /// <summary>
    /// Adayin degeri; BUYUK olan kazanir. <c>OrientationFit</c>'in tersi
    /// yondedir (orada kucuk kazanir), karistirmamak icin ad da farklidir.
    /// </summary>
    /// <param name="placedVolume">Blogun doldurdugu hacim.</param>
    /// <param name="spaceVolume">Blogun konuldugu bosluğun hacmi.</param>
    /// <param name="unusableVolume">
    /// Bosluktan geriye kalan ve kullanilamayacak hacim. Kaynakta bu terim
    /// kalan kutu olculeriyle bir knapsack tahminidir; burada daha ucuz bir
    /// YAKLASIM kullanilir (bkz. <see cref="UnusableResidual"/>), cunku bu
    /// fonksiyon aday basina calisir.
    /// </param>
    /// <param name="contactArea">Komsu kutulara ve arac yuzeylerine degen alan.</param>
    /// <param name="boxCount">Blogun tasidigi kutu sayisi; en az 1.</param>
    /// <param name="weights">Ustel agirliklar.</param>
    internal static double Score(
        decimal placedVolume,
        decimal spaceVolume,
        decimal unusableVolume,
        decimal contactArea,
        int boxCount,
        Weights weights)
    {
        if (placedVolume <= 0m || boxCount <= 0) return 0d;

        var volume = (double)placedVolume;
        var contact = Math.Max(1d, (double)contactArea);

        // Kayip orani bosluğa gore olculur: ayni mutlak kayip kucuk bir boslukta
        // agir, buyuk bir boslukta hafiftir.
        var wasteRatio = spaceVolume <= 0m
            ? 0d
            : Math.Clamp((double)(unusableVolume / spaceVolume), 0d, 1d);

        // Kayip %100 oldugunda deger sifirlanmali ama fonksiyon patlamamali.
        var usable = Math.Max(1e-9d, 1d - wasteRatio);

        return Math.Pow(volume, weights.Volume)
               * Math.Pow(usable, weights.Waste)
               * Math.Pow(contact, weights.Contact)
               * Math.Pow(1d / boxCount, weights.BoxCount);
    }

    /// <summary>
    /// Bosluktan geriye kalan ve kullanilamayacak hacmin UCUZ tahmini.
    ///
    /// Blok bosluğa yerlesince geriye eksen basina birer dilim kalir. Bir dilim,
    /// kalan en kucuk kutunun en kisa kenarindan darsa o dilime hicbir kutu
    /// giremez — kesin kayiptir. Dilimler kesisir, bu yuzden ust ust binmeyi
    /// engellemek icin sirayla soyulurlar.
    ///
    /// Kaynaktaki knapsack tahmininden daha kabadir: yalnizca "hic kutu girmez"
    /// durumunu yakalar, "girer ama kotu dolar" durumunu yakalamaz. Buna karsilik
    /// maliyeti sabittir ve aday basina calisabilir.
    /// </summary>
    internal static decimal UnusableResidual(
        decimal spaceWidth,
        decimal spaceHeight,
        decimal spaceLength,
        decimal blockWidth,
        decimal blockHeight,
        decimal blockLength,
        decimal smallestRemainingSide)
    {
        var restWidth = Math.Max(0m, spaceWidth - blockWidth);
        var restHeight = Math.Max(0m, spaceHeight - blockHeight);
        var restLength = Math.Max(0m, spaceLength - blockLength);

        var waste = 0m;

        // x dilimi: tam kesit boyunca.
        if (restWidth > 0m && restWidth < smallestRemainingSide)
        {
            waste += restWidth * spaceHeight * spaceLength;
        }

        // y dilimi: x'te blogun genisligi kadar, cunku x dilimi zaten sayildi.
        if (restHeight > 0m && restHeight < smallestRemainingSide)
        {
            waste += blockWidth * restHeight * spaceLength;
        }

        // z dilimi: x ve y'de blogun kesiti kadar.
        if (restLength > 0m && restLength < smallestRemainingSide)
        {
            waste += blockWidth * blockHeight * restLength;
        }

        return waste;
    }
}
