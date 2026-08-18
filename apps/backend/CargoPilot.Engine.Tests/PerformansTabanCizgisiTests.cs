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
/// Eşik kriter başınadır ve ölçülmüş taban çizgisinden türetilir; yalnızca üst
/// sınırdır, motor hızlanırsa test geçmeye devam eder.
/// </summary>
public sealed class PerformansTabanCizgisiTests
{
    /// <summary>Ölçümün kutu sayısı; senaryo kurucusu bunu tiplere eşit böler.</summary>
    private const int BoxCount = 500;

    /// <summary>Farklı geometri ve rotasyon serbestliği üreten ürün tipi sayısı.</summary>
    private const int TypeCount = 10;

    /// <summary>
    /// Ölçülmüş taban çizgisinin kaç katına kadar yavaşlamaya izin verildiği.
    /// 2,0 şu iki payın çarpımıdır: CI koşucusu (ubuntu-latest, 4 vCPU) ölçümün
    /// alındığı geliştirici makinesinden belirgin şekilde yavaştır (~1,5 kat), ve
    /// paylaşımlı koşucuda gündelik gürültü için üstüne pay bırakılır (~1,3 kat).
    /// Daha darı CI'da rastgele kırmızı yakar ve insanlar testi görmezden gelmeye başlar.
    /// Buna karşılık 2,0 eski ortak 120 sn sınırından çok daha sıkıdır: o sınır
    /// WeightBalance'ta yaşanan 2,6 katlık regresyonu (11,4 sn → 30,05 sn) kaçırmıştı,
    /// bu eşik 2 katı aşan bir yavaşlamayı yakalar.
    /// </summary>
    private const double CiToleransCarpani = 2.0;

    /// <summary>
    /// Kriter başına ölçülmüş taban çizgisi — üst eşik bunun
    /// <see cref="CiToleransCarpani"/> katıdır.
    ///
    /// Ölçüm tarihi: 2026-08-18.
    /// Ortam: Apple M3 Max (14 çekirdek), macOS 26.6.1 arm64, .NET SDK 8.0.419.
    /// Yöntem: <c>dotnet test CargoPilot.Engine.Tests --filter
    /// FullyQualifiedName~PerformansTabanCizgisi</c>, iki ardışık koşu, %1'den az sapma.
    ///
    /// Debug (varsayılan yerel koşu)   → VolumeFirst 9.957/9.958 ms ·
    ///   WeightBalance 29.075/29.002 ms · Lifo 8.148/8.106 ms
    /// Release (CI'ın kullandığı yapı) → VolumeFirst 5.271 ms ·
    ///   WeightBalance 18.371 ms · Lifo 4.073 ms
    ///
    /// Taban çizgisi bilinçli olarak Debug ölçümüdür: iki yapıdan yavaş olanı ve
    /// geliştiricinin yerelde çalıştırdığı varsayılan yapı odur. CI Release koştuğu
    /// için orada zaten ek pay bulunur.
    ///
    /// NOT: Bu değerler bugünkü — regresyonlu — durumu kaydeder. WeightBalance'ın
    /// 11,4 sn'ye çekilmesi F2-01'in işidir; eşik yalnızca üst sınır olduğu için
    /// o düzeltme geldiğinde bu test kırılmaz, yalnızca taban çizgisi güncellenir.
    /// </summary>
    private static readonly Dictionary<LoadingPlanOptimizationCriteria, TimeSpan> OlculenTabanCizgisi =
        new()
        {
            [LoadingPlanOptimizationCriteria.VolumeFirst] = TimeSpan.FromMilliseconds(9_957),
            [LoadingPlanOptimizationCriteria.WeightBalance] = TimeSpan.FromMilliseconds(29_075),
            [LoadingPlanOptimizationCriteria.Lifo] = TimeSpan.FromMilliseconds(8_148),
        };

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

        var baseline = OlculenTabanCizgisi[criteria];
        var upperBound = baseline * CiToleransCarpani;

        Assert.True(
            stopwatch.Elapsed < upperBound,
            string.Format(
                CultureInfo.InvariantCulture,
                "{0} kriteri {1} kutuda {2:F1} sn sürdü; üst eşik {3:F1} sn. "
                    + "2026-08-18 taban çizgisi {4:F1} sn, izin verilen çarpan {5:F1}x — "
                    + "ölçülen süre taban çizgisinin {6:F1} katı. Performans regresyonu olabilir; "
                    + "yavaşlamanın nedeni bulunmadan eşiği yükseltmeyin.",
                criteria,
                BoxCount,
                stopwatch.Elapsed.TotalSeconds,
                upperBound.TotalSeconds,
                baseline.TotalSeconds,
                CiToleransCarpani,
                stopwatch.Elapsed.TotalSeconds / baseline.TotalSeconds));
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
