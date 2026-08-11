using System.Diagnostics;
using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;
using Xunit.Abstractions;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Motorun 500 kutuluk deterministik bir girdideki çalışma süresini ölçer.
/// Amaç kıyaslama değil, taban çizgisi kaydıdır: modülerleşme adımlarının
/// öncesi/sonrası aynı senaryoda karşılaştırılabilsin diye süre konsola yazılır.
/// Eşik CI makinesine göre değişkenlik gösterdiği için dar tutulmaz; yalnızca
/// sonsuz döngü / patlayan karmaşıklık fark edilsin diye üst sınır konur.
/// </summary>
public sealed class PerformansTabanCizgisiTests
{
    /// <summary>Ölçümün kutu sayısı; senaryo kurucusu bunu tiplere eşit böler.</summary>
    private const int BoxCount = 500;

    /// <summary>Farklı geometri ve rotasyon serbestliği üreten ürün tipi sayısı.</summary>
    private const int TypeCount = 10;

    /// <summary>Yalnızca kilitlenme/patlama tespiti içindir, performans hedefi değildir.</summary>
    private static readonly TimeSpan UpperBound = TimeSpan.FromSeconds(120);

    private readonly ITestOutputHelper _output;

    public PerformansTabanCizgisiTests(ITestOutputHelper output) => _output = output;

    /// <summary>Her üç kriter de aynı 500 kutuluk girdiyle çalıştırılır ve süresi raporlanır.</summary>
    [Theory]
    [Trait("Kategori", "Performans")]
    [InlineData(LoadingPlanOptimizationCriteria.VolumeFirst)]
    [InlineData(LoadingPlanOptimizationCriteria.WeightBalance)]
    [InlineData(LoadingPlanOptimizationCriteria.Lifo)]
    public void Motor_500Kutu_SureyiRaporlar(LoadingPlanOptimizationCriteria criteria)
    {
        var input = LargeInput(criteria);

        var stopwatch = Stopwatch.StartNew();
        var result = EngineScenario.Run(input);
        stopwatch.Stop();

        var line = string.Format(
            CultureInfo.InvariantCulture,
            "[PERF] {0,-13} kutu={1} yerlesen={2} disarida={3} doluluk={4:P1} sure={5} ms",
            criteria,
            BoxCount,
            result.Placements.Count,
            result.UnplacedItems.Sum(u => u.Quantity),
            result.FillRate,
            stopwatch.ElapsedMilliseconds);

        _output.WriteLine(line);
        Console.WriteLine(line);

        Assert.True(
            stopwatch.Elapsed < UpperBound,
            $"{criteria} 500 kutuda {stopwatch.Elapsed.TotalSeconds:F1} sn sürdü, üst sınır {UpperBound.TotalSeconds:F0} sn.");
    }

    /// <summary>
    /// Deterministik girdi: rastgelelik yok, boyut/ağırlık/rotasyon tip indeksinden
    /// türetilir. Aynı koşuda ve farklı makinelerde aynı yerleşimi üretir.
    /// </summary>
    private static OptimizationInput LargeInput(LoadingPlanOptimizationCriteria criteria)
    {
        var items = new List<OptimizationItemInput>(TypeCount);

        for (var i = 0; i < TypeCount; i++)
        {
            items.Add(EngineScenario.Item(
                index: 500 + i,
                width: 40m + (i % 5) * 5m,
                height: 30m + (i % 4) * 5m,
                length: 50m + (i % 3) * 5m,
                weight: 10m + i * 2m,
                quantity: BoxCount / TypeCount,
                allowedRotations: i % 2 == 0 ? AllowedRotations.All : AllowedRotations.NoVertical,
                groupIndex: i % 3,
                unloadingOrder: i % 3 + 1));
        }

        return EngineScenario.Input(
            items,
            criteria,
            vehicleWidth: 240m,
            vehicleHeight: 260m,
            vehicleLength: 1_360m,
            vehicleMaxWeight: 24_000m);
    }
}
