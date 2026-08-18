using CargoPilot.Domain.Enums;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Yerlestirmenin YARIM KALMIS hali: o ana kadar konmus kutular, bos hacim
/// defteri, acilmis duvarlar ve tuketilmis birimler.
///
/// Neden var: ileri bakisli arama (F7-4) bir karari DENEYIP sonuna kadar
/// goturmek, sonra geri donup baska bir karari denemek zorundadir. Bunun icin
/// durumun kopyalanabilmesi gerekir. Bugune kadar durum
/// <c>WallBuilderPlacement.Run</c>'in yerel degiskenlerine dagilmisti ve
/// kopyalanamiyordu.
///
/// Kopya SIGDIR: liste ve dizi icerikleri deger tipidir ya da degismezdir,
/// <see cref="SpaceLedger"/> kendi kopyasini verir. Iki dal ayni nesneyi
/// paylasmaz.
///
/// <c>Fresh</c> ile kurulan durum, ayrimin yapilmadigi zamanki davranisla
/// birebir aynidir; bu ayiklama davranisi DEGISTIRMEZ.
/// </summary>
internal sealed class PlacementState
{
    private PlacementState(
        List<PlacedBox> placements,
        List<UnplacedBox> unplaced,
        SpaceLedger ledger,
        List<WallSegment> walls,
        bool[] consumed,
        Dictionary<Guid, UnplacedReason> failedSincePlacement,
        decimal totalWeight,
        decimal? depthBudget)
    {
        Placements = placements;
        Unplaced = unplaced;
        Ledger = ledger;
        Walls = walls;
        Consumed = consumed;
        FailedSincePlacement = failedSincePlacement;
        TotalWeight = totalWeight;
        DepthBudget = depthBudget;
    }

    internal List<PlacedBox> Placements { get; }

    internal List<UnplacedBox> Unplaced { get; }

    internal SpaceLedger Ledger { get; }

    /// <summary>Acilis sirasinda duvar dilimleri; sonuca da bu liste gecer.</summary>
    internal List<WallSegment> Walls { get; }

    /// <summary>Blok insasinin onden tukettigi birimler.</summary>
    internal bool[] Consumed { get; }

    /// <summary>
    /// Son basarili yerlestirmeden bu yana yer bulunamamis urunler. Saf bir
    /// bellektir: ayni urun ayni durumda yine sigmaz.
    /// </summary>
    internal Dictionary<Guid, UnplacedReason> FailedSincePlacement { get; }

    internal decimal TotalWeight { get; set; }

    /// <summary>Yukun toplanacagi <c>z</c> tavani; esnedigi icin durumun parcasidir.</summary>
    internal decimal? DepthBudget { get; set; }

    /// <summary>Bos arac.</summary>
    internal static PlacementState Fresh(OptimizationInput input, int instanceCount, decimal? depthBudget)
    {
        ArgumentNullException.ThrowIfNull(input);

        return new PlacementState(
            placements: [],
            unplaced: [],
            ledger: new SpaceLedger(
                input.VehicleWidth, input.VehicleHeight, input.VehicleLength, input.FillsFromMaxX),
            walls: [],
            consumed: new bool[instanceCount],
            failedSincePlacement: [],
            totalWeight: 0m,
            depthBudget: depthBudget);
    }

    /// <summary>
    /// Bagimsiz kopya. Kopyadan sonra iki durum birbirini etkilemez; ileri
    /// bakisli arama bunu her dal icin bir kez yapar.
    /// </summary>
    internal PlacementState Clone() => new(
        placements: [.. Placements],
        unplaced: [.. Unplaced],
        ledger: Ledger.Clone(),
        walls: [.. Walls],
        consumed: (bool[])Consumed.Clone(),
        failedSincePlacement: new Dictionary<Guid, UnplacedReason>(FailedSincePlacement),
        totalWeight: TotalWeight,
        depthBudget: DepthBudget);
}
