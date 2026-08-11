using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.ErpSettings;

public record ErpSettingsResponse(
    Guid Id,
    ErpProviderType ProviderType,
    string CompanyCode,
    string Username,
    string ServerAddress,
    bool HasPassword,
    bool TrustServerCertificate);
