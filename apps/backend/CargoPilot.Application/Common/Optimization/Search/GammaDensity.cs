namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// Gama olasilik yogunlugu. GWCA'nin isci hareket modeli adim boyutunu bununla
/// kucultur: iterasyon ilerledikce yerel iyilestirme adimi daralir (Guan vd. 2023).
///
/// <c>Math.Gamma</c> .NET'te yok; logaritmik gama Lanczos yaklasimiyla hesaplanir.
/// Dogrudan <c>Gamma(k)</c> hesaplamak buyuk sekil parametrelerinde tasar,
/// logaritmik biçim tasmaz.
/// </summary>
internal static class GammaDensity
{
    private static readonly double[] LanczosCoefficients =
    [
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];

    /// <summary>Gama yogunlugu: x^(k-1) · e^(-x/θ) / (Γ(k) · θ^k).</summary>
    internal static double Pdf(double x, double shape, double scale)
    {
        if (x <= 0d || shape <= 0d || scale <= 0d) return 0d;

        var logDensity = ((shape - 1d) * Math.Log(x))
                         - (x / scale)
                         - LogGamma(shape)
                         - (shape * Math.Log(scale));

        return double.IsFinite(logDensity) ? Math.Exp(logDensity) : 0d;
    }

    /// <summary>Logaritmik gama (Lanczos, g = 7, n = 9).</summary>
    internal static double LogGamma(double value)
    {
        if (value < 0.5d)
        {
            // Yansitma formulu: kucuk degerlerde Lanczos dogrudan uygulanamaz.
            return Math.Log(Math.PI / Math.Abs(Math.Sin(Math.PI * value))) - LogGamma(1d - value);
        }

        var z = value - 1d;
        var sum = 0.99999999999980993d;
        for (var i = 0; i < LanczosCoefficients.Length; i++)
        {
            sum += LanczosCoefficients[i] / (z + i + 1d);
        }

        var t = z + LanczosCoefficients.Length - 0.5d;

        return (0.5d * Math.Log(2d * Math.PI)) + ((z + 0.5d) * Math.Log(t)) - t + Math.Log(sum);
    }
}
