namespace CargoPilot.Application.Features.Plans.GetPlanById;

/// <summary>
/// Arama katmaninin kosu istatistigi. Aramasiz plan (Static sequencer) icin
/// <c>null</c>'dir.
/// </summary>
/// <remarks>
/// Dort alan birlikte yazilir; birinin dolu otekinin bos olmasi mumkun degildir.
/// </remarks>
public sealed record SearchStatsDto(
    int Iterations,
    int Evaluations,
    bool SearchImproved,
    long DurationMs);
