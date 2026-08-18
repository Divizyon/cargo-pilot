using CargoPilot.Application.Common;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Motorun tek cagri noktasi. Uretimdeki plan akisinin YALNIZ hesap kismini
/// tekrarlar: kontaminasyon filtresi + motor. Kalicilik, bildirim, yetki ve
/// veritabani bilincli olarak yoktur.
///
/// Filtre burada da calisir cunku uretimde de motordan once calisiyor
/// (CreatePlanCommandHandler); atlanirsa bench sonucu uretim sonucundan sapar
/// ve olculen sey motor olmaz.
/// </summary>
public static class EngineHost
{
    public static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        var contamination = OptimizationModules.Resolve(input).UseContamination
            ? ContaminationFilter.Filter(input.Items)
            : ContaminationFilter.Skipped(input.Items);

        var finalInput = contamination.Contaminated.Count > 0
            ? input with { Items = contamination.Passed }
            : input;

        var result = new OptimizationEngine().Run(finalInput, cancellationToken);

        return contamination.Contaminated.Count > 0
            ? result with { UnplacedItems = [.. result.UnplacedItems, .. contamination.Contaminated] }
            : result;
    }
}
