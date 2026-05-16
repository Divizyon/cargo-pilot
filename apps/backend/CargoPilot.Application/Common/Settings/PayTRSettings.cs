namespace CargoPilot.Application.Common.Settings;

public sealed class PayTRSettings
{
    public string MerchantId { get; set; } = string.Empty;
    public string MerchantKey { get; set; } = string.Empty;
    public string MerchantSalt { get; set; } = string.Empty;
    public string MerchantOkUrl { get; set; } = string.Empty;
    public string MerchantFailUrl { get; set; } = string.Empty;
    public bool TestMode { get; set; } = true;
}
