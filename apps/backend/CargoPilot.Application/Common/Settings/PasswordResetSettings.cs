namespace CargoPilot.Application.Common.Settings;

public sealed class PasswordResetSettings {
    public string FrontendResetUrl { get; set; } = null!;
    public string FrontendLoginUrl { get; set; } = string.Empty;
    public string BackendBaseUrl { get; set; } = string.Empty;
    public int TokenExpiryMinutes { get; set; } = 10;
}
