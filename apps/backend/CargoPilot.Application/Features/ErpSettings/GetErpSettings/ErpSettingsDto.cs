using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.ErpSettings.GetErpSettings;

public sealed record ErpSettingsDto(
    Guid Id,
    string CompanyCode,
    string Username,
    string ServerAddress,
    ErpProvider Provider
);
