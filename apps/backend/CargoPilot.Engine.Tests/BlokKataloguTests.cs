using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Blok kataloğu (`F7-2`) sözleşmesi.
///
/// Katalog aramanın **girdisidir**: beam search "bu boşluğa hangi blok" diye
/// sorarken buradan seçer. Yasadışı bir blok katalogda durursa arama bütçesinin
/// bir kısmı hiçbir zaman yerleşemeyecek adayları değerlendirmeye gider — ve
/// daha kötüsü, sert kural yerleştirme anında yakalanırsa aday sessizce
/// düşer, yani katalog yalan söylemiş olur.
///
/// Bu yüzden sınanan şey doluluk değil, **kataloğun kendi kurallarına
/// uyduğu**: araca sığma, elde olan adedi aşmama, istif kurallarına uyma ve
/// deterministik sıra.
/// </summary>
public sealed class BlokKataloguTests
{
    private static OptimizationItemInput Item(
        string sku,
        decimal width,
        decimal height,
        decimal length,
        int quantity,
        bool isStackable = true,
        int maxStackCount = 0,
        decimal maxWeightOnTop = 0m,
        decimal weight = 10m,
        FragilityType fragility = FragilityType.NonFragile,
        AllowedRotations rotations = AllowedRotations.Fixed) =>
        new(
            ItemId: Guid.Parse($"{sku.GetHashCode(StringComparison.Ordinal):X8}-0000-0000-0000-000000000000"),
            SKU: sku,
            Name: sku,
            Width: width,
            Height: height,
            Length: length,
            Weight: weight,
            IsStackable: isStackable,
            MaxStackCount: maxStackCount,
            MaxWeightOnTop: maxWeightOnTop,
            AllowedRotations: rotations,
            Quantity: quantity,
            FragilityType: fragility);

    private static OptimizationInput Input(params OptimizationItemInput[] items) =>
        new(
            VehicleWidth: 200m,
            VehicleHeight: 200m,
            VehicleLength: 400m,
            VehicleMaxWeight: 100_000m,
            Items: items);

    [Fact]
    public void TekKutu_TamDizilimi_Uretilir()
    {
        // 100x100x100 kutu, 200x200x400 araç → 2 x 2 x 4 = 16 birime kadar.
        var blocks = BlockCatalog.Build(Input(Item("A", 100m, 100m, 100m, quantity: 64)));

        Assert.Contains(blocks, b => b is { Nx: 2, Ny: 2, Nz: 4 });
        Assert.DoesNotContain(blocks, b => b.Nx > 2 || b.Ny > 2 || b.Nz > 4);
    }

    /// <summary>Katalog aracın dışına taşan blok üretmez.</summary>
    [Fact]
    public void HicbirBlok_AracDisinaTasmaz()
    {
        var input = Input(
            Item("A", 60m, 55m, 70m, quantity: 200),
            Item("B", 45m, 30m, 90m, quantity: 200));

        Assert.All(BlockCatalog.Build(input), b =>
        {
            Assert.True(b.Width <= input.VehicleWidth, $"{b.Width} > {input.VehicleWidth}");
            Assert.True(b.Height <= input.VehicleHeight, $"{b.Height} > {input.VehicleHeight}");
            Assert.True(b.Length <= input.VehicleLength, $"{b.Length} > {input.VehicleLength}");
        });
    }

    /// <summary>Elde olmayan kutudan blok kurulamaz.</summary>
    [Fact]
    public void HicbirBlok_EldekiAdediAsmaz()
    {
        var input = Input(Item("A", 50m, 50m, 50m, quantity: 7));

        Assert.All(BlockCatalog.Build(input), b => Assert.True(b.BoxCount <= 7, $"{b.BoxCount} > 7"));
    }

    /// <summary>İstiflenemez ürün tek katmandır: üstüne hiçbir şey konamaz.</summary>
    [Fact]
    public void IstiflenemezUrun_TekKatman()
    {
        var input = Input(Item("A", 50m, 50m, 50m, quantity: 64, isStackable: false));

        Assert.All(BlockCatalog.Build(input), b => Assert.Equal(1, b.Ny));
    }

    /// <summary>Kırılgan ürünün üstüne yük binemez; blok da bir yüktür.</summary>
    [Fact]
    public void KirilganUrun_TekKatman()
    {
        var input = Input(Item("A", 50m, 50m, 50m, quantity: 64, fragility: FragilityType.Fragile));

        Assert.All(BlockCatalog.Build(input), b => Assert.Equal(1, b.Ny));
    }

    /// <summary>
    /// `MaxStackCount` "üstünde en fazla kaç kutu olabilir" demektir; sütunun en
    /// alttaki kutusunun üstünde <c>ny - 1</c> kutu vardır.
    /// </summary>
    [Fact]
    public void AzamiIstifSayisi_SutunYuksekliginiSinirlar()
    {
        var input = Input(Item("A", 50m, 50m, 50m, quantity: 64, maxStackCount: 2));

        Assert.All(BlockCatalog.Build(input), b => Assert.True(b.Ny <= 3, $"ny={b.Ny}"));
        Assert.Contains(BlockCatalog.Build(input), b => b.Ny == 3);
    }

    /// <summary>Üstteki azami ağırlık da sütunu sınırlar: 25 kg taşıyan 10 kg'lık kutu 2 kat alır.</summary>
    [Fact]
    public void UsttekiAzamiAgirlik_SutunYuksekliginiSinirlar()
    {
        var input = Input(Item("A", 50m, 50m, 50m, quantity: 64, maxWeightOnTop: 25m, weight: 10m));

        Assert.All(BlockCatalog.Build(input), b => Assert.True(b.Ny <= 3, $"ny={b.Ny}"));
    }

    /// <summary>Katalog hacme göre azalan sıradadır; arama ilk adayları önce görür.</summary>
    [Fact]
    public void Katalog_HacmeGoreAzalanSirada()
    {
        var blocks = BlockCatalog.Build(Input(
            Item("A", 40m, 40m, 40m, quantity: 100),
            Item("B", 70m, 50m, 60m, quantity: 100)));

        for (var i = 1; i < blocks.Count; i++)
        {
            Assert.True(blocks[i - 1].Volume >= blocks[i].Volume, $"sıra bozuk: {i}");
        }
    }

    /// <summary>Aynı girdi aynı kataloğu verir — determinizm sözleşmesi (`R-C02`).</summary>
    [Fact]
    public void Katalog_Deterministik()
    {
        var input = Input(
            Item("A", 40m, 40m, 40m, quantity: 100, rotations: AllowedRotations.All),
            Item("B", 70m, 50m, 60m, quantity: 100, rotations: AllowedRotations.All));

        Assert.Equal(BlockCatalog.Build(input), BlockCatalog.Build(input));
    }

    /// <summary>Üst sınır aşılmaz; aşıldığında en hacimliler kalır.</summary>
    [Fact]
    public void UstSinir_Asilmaz()
    {
        var input = Input(Item("A", 10m, 10m, 10m, quantity: 100_000, rotations: AllowedRotations.All));

        var blocks = BlockCatalog.Build(input, maxBlocks: 50);

        Assert.Equal(50, blocks.Count);
        Assert.Equal(blocks[0].Volume, blocks.Max(b => b.Volume));
    }

    /// <summary>Yönelim serbestse aynı ürün farklı dış ölçülerle de katalogda durur.</summary>
    [Fact]
    public void SerbestYonelim_FarkliDisOlculerUretir()
    {
        var input = Input(Item("A", 100m, 60m, 40m, quantity: 8, rotations: AllowedRotations.All));

        var shapes = BlockCatalog.Build(input)
            .Select(b => (b.Width, b.Height, b.Length))
            .Distinct()
            .Count();

        Assert.True(shapes > 1, $"tek biçim üretildi: {shapes}");
    }
}
