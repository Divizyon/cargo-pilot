namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Gecici bir ERP aktarim hatasini yeniden denenebilir kilar. Hangfire'in
/// <c>AutomaticRetry</c> davranisi yalnizca exception'da tetiklendigi icin, hata sonucu
/// (Result.Failure) gecici siniftaysa job durumu kaydettikten sonra bu exception'i firlatir.
/// </summary>
public sealed class ErpExportRetryableException : Exception
{
    public ErpExportRetryableException()
    {
    }

    public ErpExportRetryableException(string message) : base(message)
    {
    }

    public ErpExportRetryableException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
