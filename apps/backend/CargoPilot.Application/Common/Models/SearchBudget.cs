namespace CargoPilot.Application.Common.Models;

/// <summary>
/// Arama butcesi. Butce asildiginda o ana kadarki EN IYI birey doner; sonuc asla
/// bos donmez (ALGORITMA-RULEBOOK.md R-C20).
/// </summary>
/// <param name="MaxIterations">Azami iterasyon.</param>
/// <param name="PopulationSize">Populasyon buyuklugu.</param>
/// <param name="MaxDurationMs">Aramanin duvar saati butcesi.</param>
/// <param name="StallIterations">Bu kadar iterasyon iyilesme yoksa durulur.</param>
public sealed record SearchBudget(
    int MaxIterations = 60,
    int PopulationSize = 30,
    int MaxDurationMs = 20_000,
    int StallIterations = 15)
{
    public static SearchBudget Default { get; } = new();

    /// <summary>
    /// Doluluk kilidi (DR-09, gecici): arama tohumun dolulugunun bu kadar altina
    /// inemez. Secim uygunluk uzerinden yapilir ama doluluk sessizce feda edilemez.
    /// </summary>
    public const decimal FillRateGuard = 0.005m;
}
