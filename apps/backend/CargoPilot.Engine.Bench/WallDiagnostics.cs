using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Duvarin KENDISI olculur: kac duvar oruldu, her duvarin yuzu ne kadar
/// kaplandi, kalan olu hava tavanda mi kenar seridinde mi.
///
/// Soru sudur: BR1 literaturde en kolay kume (3 tip, en cok tekrar) ama bizim
/// en kotu kumemiz. Iki aday sebep var ve ikisi bambaska mudahale ister:
///
///   KESIT SORUNU   : duvar yuzu (W x H) tam doldurulmuyor, kenarda dikey
///                    seritler bos kaliyor. Cozum 2B tam kaplama (G4/G5 blok).
///   DERINLIK SORUNU: duvar derinligi baskin kutunun olcusuyle uyusmuyor,
///                    duvarlar arasinda ince dilimler kaliyor. Cozum decoder'in
///                    derinlik kuralini degistirmek.
///
/// Ayirt eden olcu duvar yuzu kaplama oranidir: dusukse kesit, yuksekse
/// derinlik sorunu. Esik %95 (arastirma yaniti, 2026-08-18).
///
/// Olu havanin ayrismasi ayni soruyu ikinci bir yoldan sorar: bos sutunlarda
/// biriken olu hava kenar seridi demektir (kesit sorunu), dolu sutunlarin
/// uzerinde biriken ise tavan artigi demektir (derinlik ya da siralama).
///
/// Bu olcu ayni zamanda <c>R-C14</c>'un hic uretilmeyen iki metrigini
/// (<c>WallCount</c>, <c>AvgWallFlushness</c>) karsilar; bkz. <c>DR-38</c>.
/// </summary>
public static class WallDiagnostics
{
    /// <summary>Duvar yuzu izgarasi. Kutu olculeri tam santimetre oldugu icin bu cozunurlukte olcum tamdir.</summary>
    private const int FaceCellCm = 1;

    /// <summary>Sutun izgarasi. Olu hava ayrismasi oran sorusudur; kaba izgara yeter.</summary>
    private const int ColumnCellCm = 5;

    /// <summary>Duvar yuzu bu oranin altinda kaplaniyorsa 2B kaplama sorunu var sayilir.</summary>
    private const double FlushThresholdPercent = 95d;

    public sealed record Report(
        int WallCount,
        double MeanFaceCoveragePercent,
        double MinFaceCoveragePercent,
        double WallsBelowThresholdPercent,
        double MeanWallDepthCm,
        double DeadAirInEmptyColumnsPercent,
        double DeadAirAbovePilePercent,
        double MeanBoxesPerWall);

    private sealed record Wall(decimal ZStart, decimal ZEnd, List<PlacedItemResult> Boxes);

    public static Report Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var walls = SegmentWalls(result.Placements);
        if (walls.Count == 0) return new Report(0, 0, 0, 0, 0, 0, 0, 0);

        var coverages = walls.Select(w => FaceCoveragePercent(input, w)).ToList();
        var (emptyColumnPercent, abovePilePercent) = SplitDeadAir(input, result);

        return new Report(
            WallCount: walls.Count,
            MeanFaceCoveragePercent: coverages.Average(),
            MinFaceCoveragePercent: coverages.Min(),
            WallsBelowThresholdPercent: 100d * coverages.Count(c => c < FlushThresholdPercent) / coverages.Count,
            MeanWallDepthCm: walls.Average(w => (double)(w.ZEnd - w.ZStart)),
            DeadAirInEmptyColumnsPercent: emptyColumnPercent,
            DeadAirAbovePilePercent: abovePilePercent,
            MeanBoxesPerWall: walls.Average(w => w.Boxes.Count));
    }

    /// <summary>
    /// Duvarlari z ekseninde baglantili bilesen olarak ayirir: bir kutu mevcut
    /// duvarin bittigi yerde ya da sonrasinda basliyorsa yeni duvar acilir.
    ///
    /// Duvar orucu duvarlari bitisik orduğu icin sinir temizdir; bir kutu iki
    /// duvara birden yayilirsa ikisi tek duvar sayilir ve <c>WallCount</c>
    /// dusuk cikar — bu durum olcunun kendisinde gorunur.
    /// </summary>
    private static List<Wall> SegmentWalls(IReadOnlyList<PlacedItemResult> placements)
    {
        var walls = new List<Wall>();
        Wall? current = null;

        foreach (var box in placements.OrderBy(p => p.Z).ThenBy(p => p.PlacementId))
        {
            if (current is null || box.Z >= current.ZEnd)
            {
                current = new Wall(box.Z, box.Z + box.Length, [box]);
                walls.Add(current);
                continue;
            }

            current.Boxes.Add(box);
            if (box.Z + box.Length > current.ZEnd)
            {
                walls[^1] = current = current with { ZEnd = box.Z + box.Length };
            }
        }

        return walls;
    }

    /// <summary>
    /// Duvarin kutulari W x H kesitine izdusurulur ve kaplanan alan oranı olculur.
    /// Izdusum kullanilir cunku kesitteki bir hucre duvarin herhangi bir
    /// derinliginde doluysa o hucre "kaplandi" sayilir — aranan sey kenarda
    /// dikey serit kalip kalmadigidir.
    /// </summary>
    private static double FaceCoveragePercent(OptimizationInput input, Wall wall)
    {
        var nx = (int)Math.Ceiling(input.VehicleWidth / FaceCellCm);
        var ny = (int)Math.Ceiling(input.VehicleHeight / FaceCellCm);
        if (nx <= 0 || ny <= 0) return 0;

        var covered = new bool[nx * ny];

        foreach (var box in wall.Boxes)
        {
            var x0 = Clamp((int)(box.X / FaceCellCm), 0, nx);
            var x1 = Clamp((int)Math.Ceiling((box.X + box.Width) / FaceCellCm), 0, nx);
            var y0 = Clamp((int)(box.Y / FaceCellCm), 0, ny);
            var y1 = Clamp((int)Math.Ceiling((box.Y + box.Height) / FaceCellCm), 0, ny);

            for (var x = x0; x < x1; x++)
            {
                for (var y = y0; y < y1; y++) covered[(x * ny) + y] = true;
            }
        }

        return 100d * covered.Count(c => c) / covered.Length;
    }

    /// <summary>
    /// Olu havayi iki sinifa ayirir; ikisi de konteyner hacminin yuzdesidir.
    ///
    ///   BOS SUTUN : o (x, z) sutununda hic kutu yok — kenar seridi ya da
    ///               ulasilamamis bolge. Kesit kaplama sorununun izi.
    ///   TAVAN     : sutunda kutu var ama yigin tavana varmamis. Siralama ya da
    ///               son duvarin yuksekliginin tam bolunmemesi.
    /// </summary>
    private static (double EmptyColumns, double AbovePile) SplitDeadAir(
        OptimizationInput input,
        OptimizationResult result)
    {
        var nx = (int)Math.Ceiling(input.VehicleWidth / ColumnCellCm);
        var nz = (int)Math.Ceiling(input.VehicleLength / ColumnCellCm);
        if (nx <= 0 || nz <= 0) return (0, 0);

        var tops = new decimal[nx * nz];

        foreach (var box in result.Placements)
        {
            var x0 = Clamp((int)(box.X / ColumnCellCm), 0, nx);
            var x1 = Clamp((int)Math.Ceiling((box.X + box.Width) / ColumnCellCm), 0, nx);
            var z0 = Clamp((int)(box.Z / ColumnCellCm), 0, nz);
            var z1 = Clamp((int)Math.Ceiling((box.Z + box.Length) / ColumnCellCm), 0, nz);
            var top = box.Y + box.Height;

            for (var x = x0; x < x1; x++)
            {
                for (var z = z0; z < z1; z++)
                {
                    var i = (x * nz) + z;
                    if (top > tops[i]) tops[i] = top;
                }
            }
        }

        decimal empty = 0;
        decimal above = 0;

        foreach (var top in tops)
        {
            if (top <= 0) empty += input.VehicleHeight;
            else above += input.VehicleHeight - top;
        }

        var columnVolume = (decimal)ColumnCellCm * ColumnCellCm;
        var containerVolume = input.VehicleWidth * input.VehicleHeight * input.VehicleLength;
        if (containerVolume <= 0) return (0, 0);

        return (
            (double)(100m * empty * columnVolume / containerVolume),
            (double)(100m * above * columnVolume / containerVolume));
    }

    private static int Clamp(int value, int min, int max) => Math.Clamp(value, min, max);
}
