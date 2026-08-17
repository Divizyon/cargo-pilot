using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Kayip hacmin nereye gittigini ayristirir.
///
/// Senaryolar konteynerin bolunmus halinden uretildigi icin ulasilabilir doluluk
/// %100'dur; yani kayip hacim dogrudan "algoritmanin kaciridigi yer"dir. Ama
/// "%23 kayip" tek basina yon gostermez — kayip iki bambaska sebepten olabilir:
///
///   OLU HAVA   : yiginin ust yuzeyinin UZERINDE kalan bosluk. Kutular
///                yerlestirilebilirdi ama yigin yeterince yukselmedi. Sebep
///                siralama ya da %80 destek kuralinin adaylari elemesi.
///   IC BOSLUK  : yiginin ICINDE kalan, kutularin arasindaki bosluk. Sebep
///                yerlestirme kalitesi — yanlis kutu yanlis yere kondu.
///
/// Ikisi bambaska mudahale ister; ayirmadan hangisine calisilacagi bilinemez.
///
/// Olcum voksel izgarasiyla yapilir. Cozunurluk kaba tutulur: amac tam hacim
/// degil, iki sinif arasindaki ORAN.
/// </summary>
public static class WasteDiagnostics
{
    private const int CellCm = 10;

    public sealed record Breakdown(
        double FillPercent,
        double DeadAirPercent,
        double InternalGapPercent,
        double MeanPileHeightPercent,
        double TopRoughnessCm,
        double FlatFractionPercent,
        int UnplacedBoxes);

    public static Breakdown Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var nx = (int)Math.Ceiling(input.VehicleWidth / CellCm);
        var ny = (int)Math.Ceiling(input.VehicleHeight / CellCm);
        var nz = (int)Math.Ceiling(input.VehicleLength / CellCm);
        if (nx <= 0 || ny <= 0 || nz <= 0) return new Breakdown(0, 0, 0, 0, 0, 0, 0);

        var occupied = new bool[nx * ny * nz];

        foreach (var placement in result.Placements)
        {
            Fill(occupied, nx, ny, nz, placement);
        }

        // Her (x, z) sutununda yiginin tepesi: o sutunda dolu en yuksek hucre.
        var totalCells = (long)nx * ny * nz;
        long filled = 0;
        long deadAir = 0;
        long internalGap = 0;
        long pileHeightSum = 0;
        var tops = new List<double>(nx * nz);

        for (var x = 0; x < nx; x++)
        {
            for (var z = 0; z < nz; z++)
            {
                var top = -1;
                for (var y = ny - 1; y >= 0; y--)
                {
                    if (!occupied[Index(x, y, z, nx, ny)]) continue;

                    top = y;
                    break;
                }

                pileHeightSum += top + 1;
                tops.Add(top + 1);

                for (var y = 0; y < ny; y++)
                {
                    if (occupied[Index(x, y, z, nx, ny)]) { filled++; continue; }

                    if (y > top) deadAir++;
                    else internalGap++;
                }
            }
        }

        // Ust yuzeyin engebesi: sutun tepelerinin standart sapmasi. Engebeli
        // yuzeyde %80 destek kurali adaylari eler ve yigin yukselemez; duz
        // yuzeyde eleme olmaz. Bu sayi, "neden yukselemiyoruz" sorusunun
        // uretim koduna dokunmadan olculebilen halidir.
        var columns = (double)nx * nz;
        var meanTop = columns > 0 ? tops.Average() : 0d;
        var variance = columns > 0 ? tops.Average(t => (t - meanTop) * (t - meanTop)) : 0d;
        var roughness = Math.Sqrt(variance) * CellCm;

        // Duzluk: tepesi ortalamanin bir hucre yakininda olan sutunlarin orani.
        var flat = columns > 0
            ? tops.Count(t => Math.Abs(t - meanTop) <= 1d) / columns * 100d
            : 0d;

        return new Breakdown(
            Percent(filled, totalCells),
            Percent(deadAir, totalCells),
            Percent(internalGap, totalCells),
            columns > 0 ? pileHeightSum / columns / ny * 100d : 0d,
            roughness,
            flat,
            result.UnplacedItems.Sum(u => u.Quantity));
    }

    private static void Fill(bool[] occupied, int nx, int ny, int nz, PlacedItemResult placement)
    {
        var x0 = Clamp((int)(placement.X / CellCm), nx);
        var y0 = Clamp((int)(placement.Y / CellCm), ny);
        var z0 = Clamp((int)(placement.Z / CellCm), nz);
        var x1 = Clamp((int)Math.Ceiling((placement.X + placement.Width) / CellCm), nx + 1);
        var y1 = Clamp((int)Math.Ceiling((placement.Y + placement.Height) / CellCm), ny + 1);
        var z1 = Clamp((int)Math.Ceiling((placement.Z + placement.Length) / CellCm), nz + 1);

        for (var x = x0; x < x1 && x < nx; x++)
        {
            for (var y = y0; y < y1 && y < ny; y++)
            {
                for (var z = z0; z < z1 && z < nz; z++)
                {
                    occupied[Index(x, y, z, nx, ny)] = true;
                }
            }
        }
    }

    private static int Index(int x, int y, int z, int nx, int ny) => ((z * ny) + y) * nx + x;

    private static int Clamp(int value, int limit) => Math.Clamp(value, 0, Math.Max(0, limit));

    private static double Percent(long part, long total) => total == 0 ? 0d : (double)part / total * 100d;
}
