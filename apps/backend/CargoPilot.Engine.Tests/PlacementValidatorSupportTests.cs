using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// <c>PlacementValidator.HasSupport</c> içindeki %80 zemin desteği kuralının
/// sınır davranışını doğrular. Aday kutu her testte 100x100 taban alanına
/// sahiptir, dolayısıyla destekleyen kutunun genişliği doğrudan destek
/// yüzdesidir.
/// </summary>
public sealed class PlacementValidatorSupportTests
{
    /// <summary>Aday kutunun taban ölçüleri; alan 10.000 cm² olduğu için yüzde okuması kolaydır.</summary>
    private const decimal CandidateWidth = 100m;
    private const decimal CandidateLength = 100m;

    /// <summary>Destekleyen kutuların yüksekliği; aday bu seviyeye oturur.</summary>
    private const decimal SupportHeight = 50m;

    [Fact]
    public void Destek_YuzdeYetmisDokuz_AdayReddedilir()
    {
        var placed = new List<PlacedBox> { SupportBox(x: 0m, width: 79m) };

        Assert.False(HasSupportAtSecondLayer(placed));
    }

    [Fact]
    public void Destek_YuzdeSeksenBir_AdayKabulEdilir()
    {
        var placed = new List<PlacedBox> { SupportBox(x: 0m, width: 81m) };

        Assert.True(HasSupportAtSecondLayer(placed));
    }

    /// <summary>
    /// Tam sınır: üretim kodundaki karşılaştırma <c>&gt;= 0.80m</c> olduğu için
    /// %80 destekli aday kabul edilir. Test kuralı belgelemek içindir, eşiği
    /// değiştirmek için değil.
    /// </summary>
    [Fact]
    public void Destek_TamYuzdeSeksen_SinirDahil_AdayKabulEdilir()
    {
        var placed = new List<PlacedBox> { SupportBox(x: 0m, width: 80m) };

        Assert.True(HasSupportAtSecondLayer(placed));
    }

    /// <summary>Zemindeki kutu (Y=0) altında hiç kutu olmasa bile desteklidir.</summary>
    [Fact]
    public void Destek_ZeminSeviyesi_AltindaKutuOlmasaDaDesteklidir()
    {
        Assert.True(PlacementValidator.HasSupport(
            [],
            x: 0m,
            y: 0m,
            z: 0m,
            width: CandidateWidth,
            length: CandidateLength));
    }

    /// <summary>
    /// Destek alanları toplanır: tek başına yetersiz kalan iki kutu (%40 + %40)
    /// birlikte eşiği karşılar.
    /// </summary>
    [Fact]
    public void Destek_IkiKutuBirlikte_DestekAlanlariToplanir()
    {
        var tekBasina = new List<PlacedBox> { SupportBox(x: 0m, width: 40m) };
        Assert.False(HasSupportAtSecondLayer(tekBasina));

        var birlikte = new List<PlacedBox>
        {
            SupportBox(x: 0m, width: 40m),
            SupportBox(x: 60m, width: 40m),
        };
        Assert.True(HasSupportAtSecondLayer(birlikte));
    }

    /// <summary>Aday, destekleyen kutuların tam üstüne (Y = SupportHeight) oturur.</summary>
    private static bool HasSupportAtSecondLayer(List<PlacedBox> placed)
        => PlacementValidator.HasSupport(
            placed,
            x: 0m,
            y: SupportHeight,
            z: 0m,
            width: CandidateWidth,
            length: CandidateLength);

    /// <summary>Zemine oturan, aday kutunun uzunluğunu tam kaplayan destek kutusu.</summary>
    private static PlacedBox SupportBox(decimal x, decimal width)
        => new(
            ItemId: Guid.Empty,
            X: x,
            Y: 0m,
            Z: 0m,
            Width: width,
            Height: SupportHeight,
            Length: CandidateLength,
            Rotation: LoadingPlanPlacementRotation.NoRotation,
            Weight: 10m,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            FragilityType: FragilityType.NonFragile,
            UnloadingOrder: null);
}
