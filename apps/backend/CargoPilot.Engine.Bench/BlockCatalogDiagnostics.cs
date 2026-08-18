using System.Diagnostics;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Blok katalogunun (F7-2) BEDELI. Katalog aramanin girdisidir ama uretimi de
/// ayni 2 saniyelik butcenin icinden cikar: yuz binlerce blok ureten bir
/// katalog, aramaya hic zaman birakmaz.
///
/// Olculen uc sey: uretim suresi, ust sinira dayanip dayanmadigi ve katalogun
/// tasidigi kutu sayisi dagilimi.
/// </summary>
public static class BlockCatalogDiagnostics
{
    public sealed record Report(
        double BuildMs,
        int BlockCount,
        bool HitCap,
        double MeanBoxesPerBlock,
        int MaxBoxesPerBlock);

    public static Report Analyze(OptimizationInput input, int maxBlocks)
    {
        ArgumentNullException.ThrowIfNull(input);

        var started = Stopwatch.GetTimestamp();
        var blocks = BlockCatalog.Build(input, maxBlocks);
        var elapsed = Stopwatch.GetElapsedTime(started).TotalMilliseconds;

        return new Report(
            BuildMs: elapsed,
            BlockCount: blocks.Count,
            HitCap: blocks.Count >= maxBlocks,
            MeanBoxesPerBlock: blocks.Count == 0 ? 0d : blocks.Average(b => b.BoxCount),
            MaxBoxesPerBlock: blocks.Count == 0 ? 0 : blocks.Max(b => b.BoxCount));
    }
}
