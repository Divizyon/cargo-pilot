using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// VCS aday değerlendirme fonksiyonunun (`F7-3`) sözleşmesi.
///
/// Sınanan şey **doluluk değil, fonksiyonun yönü**: hangi terim artınca değer
/// artmalı, hangisi artınca düşmeli. Üsteller ölçülmediği için mutlak değerler
/// anlamsızdır; anlamlı olan **sıralamadır** — arama zaten yalnızca "hangi aday
/// daha iyi" sorusunu sorar.
///
/// Bu testler üsteller kalibre edildiğinde de geçerli kalmalıdır; geçmezse
/// kalibrasyon fonksiyonun anlamını bozmuş demektir.
/// </summary>
public sealed class AdayDegerlendirmeTests
{
    private static readonly BlockValue.Weights Neutral = BlockValue.Weights.Neutral;

    private static double Score(
        decimal placed = 1000m,
        decimal space = 2000m,
        decimal unusable = 0m,
        decimal contact = 100m,
        int boxes = 1) =>
        BlockValue.Score(placed, space, unusable, contact, boxes, Neutral);

    [Fact]
    public void BuyukHacim_DahaDegerli()
        => Assert.True(Score(placed: 2000m) > Score(placed: 1000m));

    [Fact]
    public void CokTemas_DahaDegerli()
        => Assert.True(Score(contact: 400m) > Score(contact: 100m));

    /// <summary>Aynı hacmi az kutuyla doldurmak yeğlenir: az arayüz, az parçalanma.</summary>
    [Fact]
    public void AzKutu_DahaDegerli()
        => Assert.True(Score(boxes: 2) > Score(boxes: 8));

    /// <summary>Arkasında kullanılamaz hacim bırakan aday cezalanır.</summary>
    [Fact]
    public void KullanilamazArtik_DegeriDusurur()
        => Assert.True(Score(unusable: 0m) > Score(unusable: 500m));

    /// <summary>
    /// Kayıp **orana** göre cezalanır: aynı mutlak artık, küçük boşlukta ağır,
    /// büyük boşlukta hafif olmalı.
    /// </summary>
    [Fact]
    public void AyniArtik_KucukBosluktaDahaAgir()
    {
        var inSmallSpace = Score(space: 1200m, unusable: 200m);
        var inLargeSpace = Score(space: 8000m, unusable: 200m);

        Assert.True(inLargeSpace > inSmallSpace);
    }

    /// <summary>Boşluğun tamamı kayıpsa değer sıfırlanır ama fonksiyon patlamaz.</summary>
    [Fact]
    public void TamKayip_SifiraYakin_VeSonlu()
    {
        var score = Score(space: 2000m, unusable: 2000m);

        Assert.True(double.IsFinite(score));
        Assert.True(score >= 0d && score < 1e-3d, $"{score}");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void YerlesenHacimYok_DegerSifir(int placed)
        => Assert.Equal(0d, Score(placed: placed));

    [Fact]
    public void KutuSayisiSifir_DegerSifir()
        => Assert.Equal(0d, Score(boxes: 0));

    // ── Kullanılamaz artık tahmini ─────────────────────────────────────────

    /// <summary>Blok boşluğu tam doldurursa artık yoktur.</summary>
    [Fact]
    public void TamOturanBlok_ArtikBirakmaz()
        => Assert.Equal(0m, BlockValue.UnusableResidual(
            spaceWidth: 100m, spaceHeight: 100m, spaceLength: 100m,
            blockWidth: 100m, blockHeight: 100m, blockLength: 100m,
            smallestRemainingSide: 20m));

    /// <summary>Kalan dilim en küçük kutudan genişse kayıp sayılmaz — oraya kutu girebilir.</summary>
    [Fact]
    public void GenisKalanDilim_KayipSayilmaz()
        => Assert.Equal(0m, BlockValue.UnusableResidual(
            spaceWidth: 100m, spaceHeight: 100m, spaceLength: 100m,
            blockWidth: 50m, blockHeight: 100m, blockLength: 100m,
            smallestRemainingSide: 20m));

    /// <summary>En küçük kutudan dar kalan dilime hiçbir kutu giremez; kesin kayıptır.</summary>
    [Fact]
    public void DarKalanDilim_TamamenKayip()
    {
        // 100 - 90 = 10 cm'lik dilim, en küçük kutu 20 cm → 10 x 100 x 100.
        var waste = BlockValue.UnusableResidual(
            spaceWidth: 100m, spaceHeight: 100m, spaceLength: 100m,
            blockWidth: 90m, blockHeight: 100m, blockLength: 100m,
            smallestRemainingSide: 20m);

        Assert.Equal(10m * 100m * 100m, waste);
    }

    /// <summary>Üç eksende de dar dilim kalırsa üçü toplanır ama üst üste binmez.</summary>
    [Fact]
    public void UcEksendeDarDilim_UstUsteBinmez()
    {
        var waste = BlockValue.UnusableResidual(
            spaceWidth: 100m, spaceHeight: 100m, spaceLength: 100m,
            blockWidth: 90m, blockHeight: 90m, blockLength: 90m,
            smallestRemainingSide: 20m);

        // x: 10x100x100 = 100.000 · y: 90x10x100 = 90.000 · z: 90x90x10 = 81.000
        Assert.Equal(271_000m, waste);
        Assert.True(waste < 100m * 100m * 100m, "kayıp boşluğun tamamını aşamaz");
    }
}
