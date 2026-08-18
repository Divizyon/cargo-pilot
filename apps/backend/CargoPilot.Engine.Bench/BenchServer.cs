using System.Globalization;
using System.Text.Json;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Test arayuzunun konustugu loopback ucu.
///
/// Ne yok: kimlik dogrulama, veritabani, EF, MinIO, bildirim, plan kaliciligi.
/// Uretim akisinda bunlarin hepsi her koşuda calisiyordu ve olcumun uzerine
/// saniyeler biniyordu. Motor saf bir hesap; bu katmanlarin hicbiri sonucunu
/// degistirmiyor.
///
/// "Cevrimdisi" iddiasinin tanimi: dis ag ve kimlik dogrulama yok — loopback var.
/// </summary>
public static class BenchServer
{
    public static async Task<int> RunAsync(BenchOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.SetMinimumLevel(LogLevel.Warning);
        builder.WebHost.UseUrls(string.Create(CultureInfo.InvariantCulture, $"http://127.0.0.1:{options.Port}"));
        builder.Services.ConfigureHttpJsonOptions(json =>
        {
            json.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            json.SerializerOptions.PropertyNameCaseInsensitive = true;
        });

        var app = builder.Build();

        app.MapGet("/health", () => Results.Ok(new { status = "ok", catalog = BenchCatalog.Version, generator = BenchCorpus.Version }));

        // Motorun tek ucu: girdi ver, cikti al.
        app.MapPost("/engine/run", (OptimizationInput input, CancellationToken cancellationToken) =>
        {
            var started = System.Diagnostics.Stopwatch.GetTimestamp();
            var result = EngineHost.Run(input, cancellationToken);
            var elapsedMs = System.Diagnostics.Stopwatch.GetElapsedTime(started).TotalMilliseconds;

            return Results.Ok(new BenchRunResponse(result, elapsedMs, DeterminismDigest.OfScenario("adhoc", result)));
        });

        // Sentetik katalog. TypeScript tarafi kendi kopyasini tutmaz, buradan
        // okur: iki dilde iki katalog tutmak, biri guncellenip digeri
        // unutuldugunda sessizce farkli senaryolar uretirdi.
        app.MapGet("/engine/catalog", () => Results.Ok(new BenchCatalogResponse(
            BenchCatalog.Version,
            [.. BenchCatalog.Vehicles.Select(v => new BenchCatalogVehicle(
                v.Id,
                v.Code,
                v.Width,
                v.Height,
                v.Length,
                v.MaxWeight,
                [.. v.Doors.Select(d => new BenchCatalogDoor(d.Type.ToString(), d.Face.ToString()))]))],
            [.. BenchCatalog.Items.Select(i => new BenchCatalogItem(
                i.Id,
                i.Code,
                i.Width,
                i.Height,
                i.Length,
                i.Weight,
                i.IsStackable,
                i.MaxStackCount,
                i.MaxWeightOnTop,
                (int)i.FragilityType,
                (int)i.AllowedRotations,
                i.StackGroup,
                i.IncompatibleGroups ?? []))])));

        // Uretilen senaryolar: TypeScript tarafi ayni korpusu kendi uretmek yerine
        // buradan alir. Tek uretici = iki kosucunun damgasi tutar.
        app.MapGet("/engine/corpus", (int? seed, int? count) =>
        {
            var scenarios = BenchCorpus.Generate(seed ?? 1, Math.Clamp(count ?? 30, 1, 500));

            return Results.Ok(new BenchCorpusResponse(
                BenchCorpus.Signature(seed ?? 1, scenarios.Count),
                BenchCatalog.Version,
                BenchCorpus.Version,
                [.. scenarios.Select(s => new BenchCorpusItem(s.Id, s.Input))]));
        });

        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, 
            $"motor ucu hazir: http://127.0.0.1:{options.Port}/engine/run  (kimlik dogrulama yok, veritabani yok)"));

        await app.RunAsync().ConfigureAwait(false);

        return BenchOptions.ExitOk;
    }

    public sealed record BenchCatalogDoor(string Type, string Face);

    public sealed record BenchCatalogVehicle(
        Guid Id,
        string Name,
        decimal Width,
        decimal Height,
        decimal Length,
        decimal MaxCargoWeight,
        IReadOnlyList<BenchCatalogDoor> Doors);

    public sealed record BenchCatalogItem(
        Guid Id,
        string Sku,
        decimal Width,
        decimal Height,
        decimal Length,
        decimal Weight,
        bool IsStackable,
        int MaxStackCount,
        decimal MaxWeightOnTop,
        int Fragility,
        int AllowedRotations,
        string? StackGroup,
        IReadOnlyList<string> IncompatibleGroups);

    public sealed record BenchCatalogResponse(
        int Version,
        IReadOnlyList<BenchCatalogVehicle> Vehicles,
        IReadOnlyList<BenchCatalogItem> Items);

    public sealed record BenchRunResponse(OptimizationResult Result, double DurationMs, string Digest);

    public sealed record BenchCorpusItem(string Id, OptimizationInput Input);

    public sealed record BenchCorpusResponse(
        string Signature,
        int CatalogVersion,
        int GeneratorVersion,
        IReadOnlyList<BenchCorpusItem> Scenarios);
}
