using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Interfaces;

public interface IOptimizationEngine
{
    /// <summary>
    /// Yerleştirmeyi hesaplar. Hesap istek içinde senkron çalıştığı için istemci
    /// bağlantıyı keserse işin sürdürülmemesi adına iptal belirteci beklenir.
    /// </summary>
    OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen yerlesimleri SABIT tutar ve yalnizca kalan kutulari yerlestirir.
    ///
    /// Plana sonradan urun eklendiginde kullanilir: tam yeniden optimizasyon
    /// mevcut kutulari da oynatir ve kullanicinin gordugu plan altindan
    /// kayar. Bu yolda eski kutular yerinde kalir, yeniler motorun butun
    /// kapilarindan gecerek konur.
    ///
    /// Donen sonuc SABITLERI DE ICERIR, yani plan tek parca kaydedilebilir.
    /// </summary>
    OptimizationResult RunIncremental(
        OptimizationInput input,
        IReadOnlyList<FixedPlacement> fixedPlacements,
        CancellationToken cancellationToken = default);
}
