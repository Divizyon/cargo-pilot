using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Artımlı yerleştirme (`G-1`): plana sonradan ürün eklendiğinde mevcut kutular
/// <b>yerinde kalmalı</b>, yalnızca yenileri konmalıdır.
///
/// Neden test ediliyor: bugüne kadar arayüz bu durumda motoru hiç çağırmıyor,
/// kendi paketleyicisiyle konum uyduruyordu — ve o paketleyici motorun sekiz
/// sert kapısının altısını uygulamıyordu. Artımlı yol o boşluğu kapatır, ama
/// ancak iki söz tutulursa değerlidir: sabitler kıpırdamayacak ve yeniler
/// bütün kapılardan geçecek.
/// </summary>
public sealed class ArtimliYerlestirmeTests
{
    private const decimal VehicleWidth = 200m;
    private const decimal VehicleHeight = 200m;
    private const decimal VehicleLength = 400m;

    /// <summary>
    /// Önce normal koşulur, sonuçtan iki kutu SABİT alınır ve aynı girdi artımlı
    /// koşulur. Sabitlerin konumu birebir korunmalı, toplam kutu sayısı
    /// değişmemelidir.
    /// </summary>
    [Fact]
    public void SabitKutular_YerindeKalir_VeKalanlarYerlesir()
    {
        var input = Senaryo();
        var full = EngineScenario.Run(input);

        Assert.True(full.Placements.Count >= 3, "Senaryo en az üç kutu yerleştirmeli.");

        var fixedOnes = full.Placements
            .OrderBy(p => p.Z).ThenBy(p => p.Y).ThenBy(p => p.X)
            .Take(2)
            .Select(p => new FixedPlacement(p.ItemId, p.X, p.Y, p.Z, p.Rotation))
            .ToList();

        var incremental = new OptimizationEngine().RunIncremental(input, fixedOnes);

        foreach (var expected in fixedOnes)
        {
            var kept = incremental.Placements.Any(p =>
                p.ItemId == expected.ItemId
                && p.X == expected.X && p.Y == expected.Y && p.Z == expected.Z
                && p.Rotation == expected.Rotation);

            Assert.True(kept, $"Sabit kutu oynatıldı: {expected.ItemId} @({expected.X},{expected.Y},{expected.Z}).");
        }

        Assert.Equal(full.Placements.Count, incremental.Placements.Count);
    }

    /// <summary>
    /// Sabit kutular motorun kendi üreteceğinden BAŞKA bir yerde olabilir —
    /// kullanıcı elle taşımış olabilir. Yeni kutular yine de fizik değişmezlerini
    /// bozmadan konmalıdır.
    /// </summary>
    [Fact]
    public void ElleKonmusSabitlerin_Uzerine_GecerliPlanUretilir()
    {
        var input = Senaryo();

        // Zemine, aracın ortasına elle konmuş tek bir kutu.
        var manual = new List<FixedPlacement>
        {
            new(EngineScenario.ItemId(0), X: 60m, Y: 0m, Z: 120m, Rotation: LoadingPlanPlacementRotation.NoRotation),
        };

        var result = new OptimizationEngine().RunIncremental(input, manual);

        Assert.Contains(result.Placements, p => p.X == 60m && p.Y == 0m && p.Z == 120m);

        PhysicalInvariants.AssertAll(nameof(ElleKonmusSabitlerin_Uzerine_GecerliPlanUretilir), input, result);
    }

    /// <summary>
    /// Girdide karşılığı kalmayan sabit yerleşim — ürün listeden çıkarılmış —
    /// sessizce düşer, koşu patlamaz.
    /// </summary>
    [Fact]
    public void GirdideOlmayanSabit_Yoksayilir()
    {
        var input = Senaryo();

        var stale = new List<FixedPlacement>
        {
            new(EngineScenario.ItemId(99), X: 0m, Y: 0m, Z: 0m, Rotation: LoadingPlanPlacementRotation.NoRotation),
        };

        var result = new OptimizationEngine().RunIncremental(input, stale);

        Assert.DoesNotContain(result.Placements, p => p.ItemId == EngineScenario.ItemId(99));
        Assert.NotEmpty(result.Placements);
    }

    /// <summary>Sabit verilmezse sonuç normal koşuyla birebir aynı olmalıdır.</summary>
    [Fact]
    public void SabitYokken_NormalKosuylaAyni()
    {
        var input = Senaryo();

        var full = EngineScenario.Run(input);
        var incremental = new OptimizationEngine().RunIncremental(input, []);

        Assert.Equal(full.Placements.Count, incremental.Placements.Count);

        foreach (var expected in full.Placements)
        {
            Assert.Contains(incremental.Placements, p =>
                p.ItemId == expected.ItemId && p.X == expected.X && p.Y == expected.Y && p.Z == expected.Z);
        }
    }

    private static OptimizationInput Senaryo()
        => EngineScenario.Input(
            [
                EngineScenario.Item(0, width: 80m, height: 60m, length: 100m, weight: 10m, quantity: 4,
                    allowedRotations: AllowedRotations.Fixed),
                EngineScenario.Item(1, width: 40m, height: 40m, length: 60m, weight: 3m, quantity: 3,
                    allowedRotations: AllowedRotations.Fixed),
            ],
            LoadingPlanOptimizationCriteria.VolumeFirst,
            vehicleWidth: VehicleWidth,
            vehicleHeight: VehicleHeight,
            vehicleLength: VehicleLength,
            vehicleMaxWeight: 1_000m);
}
