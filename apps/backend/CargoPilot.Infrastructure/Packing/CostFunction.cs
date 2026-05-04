using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

internal static class CostFunction
{
    private const int EpMax = 20;
    private const double WGround = 0.15;
    private const double WSpaceLifoOff = 0.85;
    private const double WSpaceLifoOn = 0.425;
    private const double WLifo = 0.425;

    // §7 — Toplam maliyet skoru (yüksek = iyi)
    internal static double ComputeScore(
        ExtremePoint ep,
        Rotation rot,
        ItemSpec item,
        int epCountAfterPlacement,
        ContainerSpec container,
        PackingParameters parameters,
        int lifoMax)
    {
        double fGround = GroundProximity((double)ep.Z, (double)container.Height);
        double fSpace = SpaceQuality(epCountAfterPlacement);

        double wSpace = parameters.LifoEnabled ? WSpaceLifoOn : WSpaceLifoOff;
        double wLifo = parameters.LifoEnabled ? WLifo : 0.0;

        double lifoScore = 0.0;
        if (parameters.LifoEnabled && item.LifoIndex.HasValue && lifoMax > 0)
            lifoScore = LifoAlignment((double)ep.X, item.LifoIndex.Value, lifoMax, (double)container.Length);

        return WGround * fGround + wSpace * fSpace + wLifo * lifoScore;
    }

    private static double GroundProximity(double z, double hc)
    {
        if (hc <= 0) return 1.0;
        return 1.0 - z / hc;
    }

    private static double SpaceQuality(int epCountAfter)
        => 1.0 - (double)epCountAfter / EpMax;

    // lifo=1 (ilk çıkacak) → x_ideal=0 (kapı), lifo=max (son çıkacak) → x_ideal=Lc (arka)
    // Formül: x_ideal = (lifo_i - 1) / (lifo_max - 1) * Lc
    private static double LifoAlignment(double x, int lifoIndex, int lifoMax, double lc)
    {
        if (lc <= 0) return 0.0;
        double denominator = lifoMax > 1 ? lifoMax - 1.0 : 1.0;
        double xIdeal = (lifoIndex - 1.0) / denominator * lc;
        return 1.0 - Math.Abs(x - xIdeal) / lc;
    }
}
