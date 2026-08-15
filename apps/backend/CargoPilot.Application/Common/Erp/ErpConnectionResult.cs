namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Baglanti testi sonucu. <paramref name="Warning"/> baglanti kurulsa da dikkat edilmesi
/// gereken durumu anlatir (or. hesabin yazma yetkisi olmasi).
/// </summary>
public record ErpConnectionResult(bool IsSuccess, string? ErrorMessage, string? Warning = null);
