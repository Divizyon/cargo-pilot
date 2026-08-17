using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Korpusun SEKLI: kule insasi (F4a) yalnizca ayni olcude cok sayida kutu varsa
/// isler, cunku kule ayni ayak izini paylasan kutulari tek sutunda toplar.
///
/// Bu olcum bir varsayimi kirdi: hacim korpusu parcalari TAM olcuye gore
/// grupluyor ve giyotin kesim noktalari rastgele oldugu icin ayni olcunun kac
/// kez tekrarlandigi belli degildi. Kule denemesi kazandirmadiginda ilk
/// sorulacak soru "kule hic ateslendi mi" oldu — cevabi tahmin etmek yerine
/// korpusun kendisi olculuyor.
/// </summary>
public static class CorpusDiagnostics
{
    public sealed record Shape(
        double ItemTypes,
        double MeanQuantity,
        double UnitsInRepeatedTypesPercent,
        double UnitsStackableTwicePercent,
        double LargestTypeSharePercent);

    public static Shape Analyze(OptimizationInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var units = input.Items.Sum(i => i.Quantity);
        if (units == 0) return new Shape(0d, 0d, 0d, 0d, 0d);

        var repeated = input.Items.Where(i => i.Quantity > 1).Sum(i => i.Quantity);

        // Kulenin en dusuk anlamli hali iki kattir: kutunun EN KISA kenari taban
        // olsa bile iki tanesi araca sigmiyorsa o urun hicbir kule kuramaz.
        var stackableTwice = input.Items
            .Where(i => 2 * Math.Min(i.Height, Math.Min(i.Width, i.Length)) <= input.VehicleHeight)
            .Sum(i => i.Quantity);

        var largest = input.Items.Count == 0 ? 0 : input.Items.Max(i => i.Quantity);

        return new Shape(
            input.Items.Count,
            (double)units / input.Items.Count,
            (double)repeated / units * 100d,
            (double)stackableTwice / units * 100d,
            (double)largest / units * 100d);
    }
}
