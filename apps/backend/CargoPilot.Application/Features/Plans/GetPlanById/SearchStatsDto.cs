namespace CargoPilot.Application.Features.Plans.GetPlanById;

/// <summary>
/// Arama katmaninin kosu istatistigi. Aramasiz plan (Static sequencer) icin
/// <c>null</c>'dir.
/// </summary>
/// <remarks>
/// Kalicilik F4'e ertelendi (ALGORITMA-YOL-HARITASI.md F0-7); alan bugun her
/// planda <c>null</c> doner. Sozlesme yine de simdi acilir, boylece test araci
/// ve frontend semasi tek seferde yazilir.
/// </remarks>
public sealed record SearchStatsDto(
    int Iterations,
    int Evaluations,
    bool SearchImproved,
    long DurationMs);
