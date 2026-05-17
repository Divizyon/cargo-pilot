namespace CargoPilot.Application.Common.Settings;

public sealed class ResendSettings {
    public string BaseUrl { get; set; } = null!;
    public string ApiKey { get; set; } = null!;
    public string FromEmail { get; set; } = null!;
    public string FromName { get; set; } = "Cargo Pilot";
    public string ContactRecipientEmail { get; set; } = null!;
}
