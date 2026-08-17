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
/// Varsayilanlar OLCULEN isletme noktasidir. Onceki <c>20_000</c> ms duvar saati
/// bir istek icinde savunulamazdi ve hicbir olcumu temsil etmiyordu.
///
/// Sure/kalite egrisi (BR1-BR7, 70 ornek):
/// 0,5 sn → %85,47 · 1 sn → %86,21 · <b>2 sn → %86,66</b> · 4 sn → %86,85 ·
/// 8 sn → %86,91 · 16 sn → %86,91.
///
/// Egri 8 saniyede doyuyor. Iki saniye kazancin neredeyse tamamini topluyor:
/// yarim saniyeden 2 saniyeye +1,19 puan, 2 saniyeden 16 saniyeye yalnizca
/// +0,25. Bu yuzden varsayilan 2 sn'de durur; daha uzun butce isteyen cagri
/// bunu acikca vermelidir.
///
/// <c>MaxIterations</c> zaman butcesi baglayici oldugunda etkisizdir; kucuk
/// orneklerde ise 40 tur erken bitiriyordu. 100'e cikarmak zaman baglayiciyken
/// hicbir sey degistirmez, baglayici degilken aramaya devam ettirir.
/// <c>StallIterations</c> olculdu ve etkisiz cikti (15/40/100/1000 arasi fark
/// gurultu bandinda), bu yuzden dokunulmadi.
/// </remarks>
public sealed record SearchBudget(
    int MaxIterations = 100,
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
