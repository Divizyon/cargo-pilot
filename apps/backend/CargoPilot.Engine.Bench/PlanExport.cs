using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Kosunun senaryo bazinda GORULEBILIR ciktisi: her plan, kutulariyla birlikte.
///
/// Neden var: ozet tablo "yedi yuz ornekte ortalama %84,26" der ve bu ortalamanin
/// arkasindaki tek bir planin neye benzedigini soylemez. Bir gerilemenin ya da
/// kazancin SEBEBINI gormek icin plana bakmak gerekiyor; bugune kadar bunun tek
/// yolu elle senaryo kurup API'ye gondermekti.
///
/// Cikti tek bir JSON dosyasidir ve
/// <c>apps/algorithm-viewer/index.html</c> tarafindan okunur.
///
/// OLCUMU YAVASLATMAZ: yalnizca <c>--viewer</c> verildiginde yazilir, kapali
/// kosuda tek bir ek islem yapilmaz.
///
/// Alan adlari KISADIR (x, y, z, w, h, l, t) cunku yedi yuz senaryo x yuz kutu
/// uzun adlarla onlarca megabayta cikardi; dosya tarayiciya elle surukleniyor.
/// </summary>
public static class PlanExport
{
    private static readonly JsonSerializerOptions Options = new()
    {
        // Ciktiyi tarayici okuyor; camelCase JS tarafinda dogal duruyor.
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Kutu: konum, olcu ve tip indeksi. Sira YERLESTIRME sirasidir.</summary>
    public sealed record Box(int X, int Y, int Z, int W, int H, int L, int T);

    /// <summary>Yerlesemeyen kalem: tip indeksi, adet, sebep kodu.</summary>
    public sealed record Missing(int T, int N, string Reason);

    public sealed record Scenario(
        string Id,
        int Set,
        double FillPercent,
        double SpreadRatio,
        double SliceUtilPercent,
        int VehicleWidth,
        int VehicleHeight,
        int VehicleLength,
        IReadOnlyList<string> Types,
        IReadOnlyList<Box> Boxes,
        IReadOnlyList<Missing> Unplaced);

    public sealed record Bundle(
        string Sequencer,
        double LoadRatio,
        string Constraints,
        double MeanFillPercent,
        IReadOnlyList<Scenario> Scenarios);

    /// <summary>Tek senaryoyu disa aktarilabilir bicime cevirir.</summary>
    public static Scenario From(string id, int set, OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        // Tip indeksi kutu basina kimlik tasimamak icin: yuz kutuda ayni GUID'i
        // yuz kez yazmak dosyanin yarisini yerdi.
        var order = new Dictionary<Guid, int>();
        var names = new List<string>();

        foreach (var item in input.Items)
        {
            if (order.ContainsKey(item.ItemId)) continue;

            order[item.ItemId] = names.Count;
            names.Add(item.SKU);
        }

        var spread = SpreadDiagnostics.Analyze(input, result);

        return new Scenario(
            Id: id,
            Set: set,
            FillPercent: Math.Round((double)result.FillRate * 100d, 2),
            SpreadRatio: Math.Round(spread.SpreadRatio, 4),
            SliceUtilPercent: Math.Round(spread.SliceUtilPercent, 2),
            VehicleWidth: (int)input.VehicleWidth,
            VehicleHeight: (int)input.VehicleHeight,
            VehicleLength: (int)input.VehicleLength,
            Types: names,
            Boxes:
            [
                .. result.Placements.Select(p => new Box(
                    (int)p.X, (int)p.Y, (int)p.Z,
                    (int)p.Width, (int)p.Height, (int)p.Length,
                    order.TryGetValue(p.ItemId, out var type) ? type : 0)),
            ],
            Unplaced:
            [
                .. result.UnplacedItems.Select(u => new Missing(
                    order.TryGetValue(u.ItemId, out var type) ? type : 0,
                    u.Quantity,
                    u.Reason.ToString())),
            ]);
    }

    public static void Write(string path, Bundle bundle)
    {
        ArgumentNullException.ThrowIfNull(bundle);

        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);

        File.WriteAllText(path, JsonSerializer.Serialize(bundle, Options));

        var size = new FileInfo(path).Length / 1024d / 1024d;
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"gorunum: {path}  ({bundle.Scenarios.Count} senaryo, {size:F1} MB)"));
        Console.WriteLine("  apps/algorithm-viewer/index.html dosyasini acip bunu uzerine birak");
    }
}
