using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Kırılgan sıralaması (`F9-1`, Krebs-Ehmke DBLF): kırılganlık birincil sıralama
/// anahtarıdır ve kırılgan kutular sıranın sonuna kayar. Yerleştirme sırayla
/// yukarı ilerlediği için bu, kırılganı yığının TEPESİNE taşır ve mühürlediği
/// sütun boşluğunu ölü olmaktan çıkarır.
///
/// İki değişmez sınanır ve ikincisi birincisinden önemlidir:
///   (1) Kırılgan kutu gerçekten sona kayıyor mu — mekanizma çalışıyor mu.
///   (2) Kırılgan kutu YOKKEN sıra bugünküyle BİREBİR aynı mı — bayrağın
///       kırılganlık taşımayan hiçbir yükte etkisi olmamalı. Ölçümde de böyle
///       çıktı (suit hacim ailesi %86,32 iki koşuda da aynı), ama ölçüm bir
///       kapı değil; değişmez burada kilitlenir.
/// </summary>
public sealed class KirilganSiralamasiTests
{
    /// <summary>Tek kutu eninde, iki kat yüksekliğinde araç: istif dışında yer yok.</summary>
    private const decimal Side = 100m;
    private const decimal TwoLayers = 200m;

    /// <summary>
    /// Kırılgan kutu HACİMCE büyük olsa bile sona kayar; küçük olan sağlam kutu
    /// zemine, kırılgan tepeye yerleşir. Bayrak kapalıyken tam tersi olur —
    /// hacim-azalan sıra kırılganı zemine koyar ve üstünü mühürler.
    /// </summary>
    [Fact]
    public void KirilganKutu_SiraninSonuna_Kayar()
    {
        var input = Column(fragileIsLarger: true, fragileLast: true);

        var result = EngineScenario.Run(input);

        Assert.Equal(2, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);

        // Sağlam kutu (90 cm) zemine, kırılgan onun üstüne.
        var fragile = Assert.Single(result.Placements, p => p.ItemId == EngineScenario.ItemId(1));
        Assert.Equal(90m, fragile.Y);
    }

    /// <summary>
    /// Bayrak kapalıyken kırılgan kutu (daha büyük olduğu için) zemine düşer ve
    /// üstündeki katı mühürler; ikinci kutu dışarıda kalır. Kazancın nereden
    /// geldiğini gösteren kontrol vakası.
    /// </summary>
    [Fact]
    public void BayrakKapaliyken_KirilganZemineDuser_VeUstuMuhurlenir()
    {
        var input = Column(fragileIsLarger: true, fragileLast: false);

        var result = EngineScenario.Run(input);

        var placed = Assert.Single(result.Placements);
        Assert.Equal(EngineScenario.ItemId(1), placed.ItemId);
        Assert.Equal(0m, placed.Y);

        var unplaced = Assert.Single(result.UnplacedItems);
        Assert.Equal(EngineScenario.ItemId(2), unplaced.ItemId);
    }

    /// <summary>
    /// Kırılgan kutu YOKKEN bayrak hiçbir şeyi değiştirmemeli: anahtar sabit
    /// kalır ve <c>OrderBy</c> kararlı olduğu için sıra bugünküyle bire birdir.
    /// </summary>
    [Fact]
    public void KirilganYokken_Bayrak_HicbirSeyiDegistirmez()
    {
        var without = EngineScenario.Run(Plain(fragileLast: false));
        var with = EngineScenario.Run(Plain(fragileLast: true));

        Assert.Equal(without.FillRate, with.FillRate);
        Assert.Equal(without.Placements.Count, with.Placements.Count);

        for (var i = 0; i < without.Placements.Count; i++)
        {
            Assert.Equal(without.Placements[i].ItemId, with.Placements[i].ItemId);
            Assert.Equal(without.Placements[i].X, with.Placements[i].X);
            Assert.Equal(without.Placements[i].Y, with.Placements[i].Y);
            Assert.Equal(without.Placements[i].Z, with.Placements[i].Z);
        }
    }

    /// <summary>
    /// Bir kırılgan bir sağlam kutu; kırılgan olan daha BÜYÜK, yani hacim-azalan
    /// sıra onu öne alır. Araç iki katlıktır, dolayısıyla sıralama doğrudan
    /// hangi kutunun zemine düştüğünü belirler.
    /// </summary>
    private static OptimizationInput Column(bool fragileIsLarger, bool fragileLast)
        => new(
            VehicleWidth: Side,
            VehicleHeight: TwoLayers,
            VehicleLength: Side,
            VehicleMaxWeight: 10_000m,
            Items:
            [
                Box(1, height: fragileIsLarger ? 100m : 90m, FragilityType.Fragile),
                Box(2, height: fragileIsLarger ? 90m : 100m, FragilityType.NonFragile),
            ],
            FragileLast: fragileLast);

    /// <summary>Kırılgan kutu içermeyen, aynı biçimde iki kalemli senaryo.</summary>
    private static OptimizationInput Plain(bool fragileLast)
        => new(
            VehicleWidth: Side,
            VehicleHeight: TwoLayers,
            VehicleLength: Side,
            VehicleMaxWeight: 10_000m,
            Items:
            [
                Box(1, height: 100m, FragilityType.NonFragile),
                Box(2, height: 90m, FragilityType.NonFragile),
            ],
            FragileLast: fragileLast);

    private static OptimizationItemInput Box(int index, decimal height, FragilityType fragility)
        => new(
            ItemId: EngineScenario.ItemId(index),
            SKU: $"SKU-{index}",
            Name: $"Urun-{index}",
            Width: Side,
            Height: height,
            Length: Side,
            Weight: 10m,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            AllowedRotations: AllowedRotations.Fixed,
            Quantity: 1,
            GroupId: null,
            UnloadingOrder: null,
            StackGroup: null,
            IncompatibleGroups: null,
            FragilityType: fragility);
}
