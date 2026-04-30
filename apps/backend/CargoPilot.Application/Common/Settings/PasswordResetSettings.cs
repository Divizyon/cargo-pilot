namespace CargoPilot.Application.Common.Settings;

public sealed class PasswordResetSettings {
    public string FrontendResetUrl { get; set; } = null!;
    public int TokenExpiryMinutes { get; set; } = 10;
}
