using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Yukun arac uzunlugunun ne kadarina YAYILDIGINI olcer.
///
/// Neden ayri bir olcu gerekiyor: <c>FillRate</c> yalnizca TASAN yukte anlamlidir.
/// Yuk araca sigdiginda butun kutular yerlesir ve doluluk, yerlesimin bicimi ne
/// olursa olsun ayni cikar — yani doluluk bu rejimde bir kalite olcusu degil,
/// yalnizca yukun buyuklugudur. Wascher, Haussner &amp; Schumann (2007)
/// tipolojisinde iki ayri problem sinifidir: tasan yuk tek-sirt-cantasi (SKP),
/// sigan yuk ise ACIK BOYUT problemidir (ODP / 3B serit paketleme) ve orada
/// amac "kullanilan uzunlugu en aza indirmek"tir.
///
/// Olculen iki sayi bu sinifin metrikleridir:
///
///   YAYILMA        — kullanilan uzunluk / ideal uzunluk. Ideal, yukun kesite
///                    kusursuz sigmasi halinde kaplayacagi uzunluktur
///                    (hacim / (genislik x yukseklik)) ve asagi sinirdir; 1,0
///                    erisilemez ama ondan uzaklik dogrudan israftir.
///   DILIM DOLULUGU — kullanilan dilimin ICINDEKI doluluk. Yayilma neden
///                    buyudu sorusunu ayirir: dusukse yuk seyrek dagilmis,
///                    yuksekse kesit dolu ama daha kisa bir dilime sigmiyor.
///
/// Uretim planlarinin cogu sigan-yuk rejimindedir; BR korpusu ise tamamen
/// tasan-yuk rejimidir. Bu olcu olmadan o rejimdeki hicbir gerileme gorunmez.
/// </summary>
public static class SpreadDiagnostics
{
    public sealed record Report(
        decimal UsedLengthCm,
        decimal IdealLengthCm,
        double SpreadRatio,
        double SliceUtilPercent,
        double VehicleLengthUsedPercent,
        bool AllPlaced,
        int WallCount);

    public static Report Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var section = input.VehicleWidth * input.VehicleHeight;
        var walls = result.Walls?.Count ?? 0;
        var allPlaced = result.UnplacedItems.Count == 0;

        if (result.Placements.Count == 0 || section <= 0m)
        {
            return new Report(0m, 0m, 1d, 0d, 0d, allPlaced, walls);
        }

        var used = result.Placements.Max(p => p.Z + p.Length);
        var volume = result.Placements.Sum(p => p.Width * p.Height * p.Length);
        var ideal = volume / section;

        // Ideal sifira yakinsa oran anlamsizdir; yerlesim de zaten yok denecek
        // kadar kucuktur.
        var spread = ideal <= 0m ? 1d : (double)(used / ideal);
        var slice = used <= 0m ? 0d : (double)(volume / (used * section)) * 100d;

        return new Report(
            UsedLengthCm: used,
            IdealLengthCm: ideal,
            SpreadRatio: spread,
            SliceUtilPercent: slice,
            VehicleLengthUsedPercent: (double)(used / input.VehicleLength) * 100d,
            AllPlaced: allPlaced,
            WallCount: walls);
    }
}
