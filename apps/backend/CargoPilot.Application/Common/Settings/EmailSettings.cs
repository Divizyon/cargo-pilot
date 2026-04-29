namespace CargoPilot.Application.Common.Settings;

public sealed class EmailSettings {
    public string SmtpHost { get; set; } = null!;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = null!;
    public string SmtpPassword { get; set; } = null!;
    public string FromAddress { get; set; } = null!;
    public string FromName { get; set; } = "Cargo Pilot";
}
