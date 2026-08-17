namespace CargoPilot.Application.Common.Models;

/// <summary>
/// Arama butcesi. Butce asildiginda o ana kadarki EN IYI birey doner; sonuc asla
/// bos donmez (ALGORITMA-RULEBOOK.md R-C20).
/// </summary>
/// <param name="MaxIterations">Azami iterasyon.</param>
/// <param name="PopulationSize">Populasyon buyuklugu.</param>
/// <param name="MaxDurationMs">Aramanin duvar saati butcesi.</param>
/// <param name="StallIterations">Bu kadar iterasyon iyilesme yoksa durulur.</param>
/// <remarks>
/// Varsayilanlar OLCULEN isletme noktasidir: BR1-BR7 uzerinde raporlanan
/// %85,32 doluluk tam olarak bu butceyle alindi (medyan ~0,4-1,9 sn, p95 ~2 sn).
/// Onceki <c>20_000</c> ms duvar saati bir istek icinde savunulamazdi ve hicbir
/// olcumu temsil etmiyordu.
/// </remarks>
public sealed record SearchBudget(
    int MaxIterations = 40,
    int PopulationSize = 20,
    int MaxDurationMs = 2_000,
    int StallIterations = 15)
{
    public static SearchBudget Default { get; } = new();

    /// <summary>
    /// Doluluk kilidi (DR-09, gecici): arama tohumun dolulugunun bu kadar altina
    /// inemez. Secim uygunluk uzerinden yapilir ama doluluk sessizce feda edilemez.
    /// </summary>
    public const decimal FillRateGuard = 0.005m;
}
