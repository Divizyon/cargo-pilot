namespace CargoPilot.Application.Common.Config;

public static class OptimizationLimits
{
    /// <summary>
    /// Tek planda yerleştirilebilecek azami kutu sayısı (miktarlar açıldıktan sonra).
    /// Yerleştirme maliyeti kutu sayısıyla süper-lineer büyür ve hesap istek
    /// içinde senkron çalışır; sınır olmadan büyük listeler isteği zaman aşımına
    /// uğratır. Arka plan işine taşındığında bu sınır gevşetilebilir.
    /// </summary>
    public const int MaxTotalBoxCount = 500;
}
