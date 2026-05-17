namespace CargoPilot.Application.Features.Settings;

public sealed record ReportingSettingsResponse(
    string? CompanyName,
    string? Phone,
    string? Email,
    string? Address,
    string? LogoUrl);
