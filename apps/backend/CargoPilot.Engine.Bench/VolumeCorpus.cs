using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Hacim odakli senaryo uretici: konteyner giyotin kesimlerle parcalara bolunur,
/// parcalar da kutu olur.
///
/// Kritik ozellik: uretilen yuk konteynere TAM sigar. Kutular konteynerin kendi
/// hacminin bolunmus halidir, yani %100 doluluk yapica mumkundur. Boylece
/// "algoritma ne kadar iyi" sorusu olculebilir bir sayiya iner: ulasilan doluluk
/// dogrudan kalite oranidir. Rastgele kutu uretiminde bu referans yoktur — %52
/// doluluk iyi mi kotu mu, bilinemez.
///
/// Agirlik ve kisitlar bilincli olarak devre disi: olculen sey yalnizca hacim
/// yerlesimi. Agirlik limiti ya da istif kisiti devreye girerse dusuk doluluk
/// algoritmanin degil senaryonun sonucu olur.
/// </summary>
public static class VolumeCorpus
{
    /// <summary>Uretim mantiginin surumu; degisirse ayni tohum farkli liste verir.</summary>
    public const int Version = 1;

    /// <summary>Kutu kenari bu araligin disina cikmaz (cm).</summary>
    private const int MinSide = 20;
    private const int MaxSide = 160;

    public sealed record VolumeScenario(string Id, OptimizationInput Input, decimal AchievableFill);

    private sealed record Cut(int X, int Y, int Z, int Width, int Height, int Length)
    {
        public long Volume => (long)Width * Height * Length;
    }

    public static List<VolumeScenario> Generate(int seed, int count)
    {
        var rng = new BenchRng(seed);
        var scenarios = new List<VolumeScenario>(count);

        for (var index = 1; index <= count; index++)
        {
            scenarios.Add(Build(rng, seed, index));
        }

        return scenarios;
    }

    private static VolumeScenario Build(BenchRng rng, int seed, int index)
    {
        // Arac olculeri her senaryoda degisir; sabit arac, sabit bir yerlesim
        // deseni odullendirir ve olcum tek bir geometriye asiri uyum saglardi.
        var width = rng.NextInt(200, 260);
        var height = rng.NextInt(200, 280);
        var length = rng.NextInt(400, 1400);

        var targetPieces = rng.NextInt(40, 220);
        var pieces = Split(rng, width, height, length, targetPieces);

        // Kutular olculerine gore gruplanir: motor girdisi "urun + adet" tasiyor,
        // her parcayi ayri urun yapmak katalogu gereksiz sisirirdi.
        var grouped = pieces
            .GroupBy(p => (p.Width, p.Height, p.Length))
            .OrderByDescending(g => (long)g.Key.Width * g.Key.Height * g.Key.Length)
            .ThenBy(g => g.Key.Width)
            .ThenBy(g => g.Key.Height)
            .ThenBy(g => g.Key.Length)
            .ToList();

        var items = new List<OptimizationItemInput>(grouped.Count);
        for (var i = 0; i < grouped.Count; i++)
        {
            var (w, h, l) = grouped[i].Key;
            var code = string.Create(CultureInfo.InvariantCulture, $"VOL-{seed}-{index}-{i:D3}");

            items.Add(new OptimizationItemInput(
                ItemId: BenchCatalog.StableId(code),
                SKU: code,
                Name: code,
                Width: w,
                Height: h,
                Length: l,
                // Agirlik hacimle orantili ve kucuk; arac kapasitesi hicbir zaman
                // baglayici olmasin diye asagida bol tutuluyor.
                Weight: Math.Round((decimal)((long)w * h * l) / 1_000_000m, 3),
                IsStackable: true,
                MaxStackCount: 0,
                MaxWeightOnTop: 0m,
                AllowedRotations: AllowedRotations.All,
                Quantity: grouped[i].Count(),
                GroupId: null,
                UnloadingOrder: null,
                StackGroup: null,
                IncompatibleGroups: null,
                FragilityType: FragilityType.NonFragile));
        }

        var input = new OptimizationInput(
            VehicleWidth: width,
            VehicleHeight: height,
            VehicleLength: length,
            VehicleMaxWeight: 1_000_000m,
            Items: items,
            Criteria: LoadingPlanOptimizationCriteria.VolumeFirst,
            LoadingType: LoadingType.Rear,
            ClusterGroups: false,
            Modules: null,
            FillFromMaxX: false);

        // Parcalar konteynerin bolunmus hali oldugu icin ulasilabilir doluluk 1.0'dir.
        return new VolumeScenario(
            string.Create(CultureInfo.InvariantCulture, $"v{seed}-{index:D4}"),
            input,
            1m);
    }

    /// <summary>
    /// Giyotin bolme: her adimda en buyuk parca rastgele bir eksende ikiye
    /// bolunur. Kesim noktalari tam sayidir, boylece parcalarin toplami
    /// konteyneri bosluksuz doldurur — yuvarlama olsaydi "tam sigar" garantisi
    /// kaybolurdu.
    /// </summary>
    private static List<Cut> Split(BenchRng rng, int width, int height, int length, int targetPieces)
    {
        var pieces = new List<Cut> { new(0, 0, 0, width, height, length) };

        while (pieces.Count < targetPieces)
        {
            var index = PickSplittable(pieces);
            if (index < 0) break;

            var piece = pieces[index];
            pieces.RemoveAt(index);
            pieces.AddRange(SplitOne(rng, piece));
        }

        return pieces;
    }

    /// <summary>
    /// Bolunecek parca: once ust sinirin uzerindekiler (kutu cok buyuk kalmasin),
    /// yoksa en buyuk hacimli. Sirf hacme bakmak MaxSide'i asan uzun parcalari
    /// birakabiliyordu.
    /// </summary>
    private static int PickSplittable(List<Cut> pieces)
    {
        var best = -1;
        var oversized = false;
        long bestVolume = -1;

        for (var i = 0; i < pieces.Count; i++)
        {
            var piece = pieces[i];
            if (!CanSplit(piece)) continue;

            var isOversized = piece.Width > MaxSide || piece.Height > MaxSide || piece.Length > MaxSide;

            if (oversized && !isOversized) continue;

            if ((isOversized && !oversized) || piece.Volume > bestVolume)
            {
                oversized |= isOversized;
                bestVolume = piece.Volume;
                best = i;
            }
        }

        return best;
    }

    private static bool CanSplit(Cut piece)
        => piece.Width >= 2 * MinSide || piece.Height >= 2 * MinSide || piece.Length >= 2 * MinSide;

    private static IEnumerable<Cut> SplitOne(BenchRng rng, Cut piece)
    {
        var axes = new List<int>(3);
        if (piece.Width >= 2 * MinSide) axes.Add(0);
        if (piece.Height >= 2 * MinSide) axes.Add(1);
        if (piece.Length >= 2 * MinSide) axes.Add(2);

        // Ust siniri asan eksen varsa once o bolunur; aksi halde kutu MaxSide'in
        // uzerinde kalirdi.
        var forced = axes.Where(a => SideOf(piece, a) > MaxSide).ToList();
        var axis = forced.Count > 0 ? rng.Pick(forced) : rng.Pick(axes);

        var side = SideOf(piece, axis);
        var at = rng.NextInt(MinSide, side - MinSide);

        return axis switch
        {
            0 =>
            [
                piece with { Width = at },
                piece with { X = piece.X + at, Width = side - at },
            ],
            1 =>
            [
                piece with { Height = at },
                piece with { Y = piece.Y + at, Height = side - at },
            ],
            _ =>
            [
                piece with { Length = at },
                piece with { Z = piece.Z + at, Length = side - at },
            ],
        };
    }

    private static int SideOf(Cut piece, int axis)
        => axis switch { 0 => piece.Width, 1 => piece.Height, _ => piece.Length };
}
