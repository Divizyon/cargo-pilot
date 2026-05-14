namespace CargoPilot.Application.Common.Settings;

public sealed class EmailChangeSettings {
    public string FrontendConfirmUrl { get; set; } = null!;
    public int TokenExpiryMinutes { get; set; } = 60;
}
