using CargoPilot.Domain.Enums;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Features.ErpSettings;

/// <summary>
/// <paramref name="LastTestSucceeded"/> ve <paramref name="LastTestedAt"/> yalnizca son test
/// kayitli yapilandirmayla ayni ayarlarda alindiysa doldurulur; aksi halde null doner ve
/// arayuz 'test edilmedi' notr durumunu gosterir.
/// </summary>
public record ErpSettingsResponse(
    Guid Id,
    ErpProviderType ProviderType,
    string CompanyCode,
    string Username,
    string ServerAddress,
    bool HasPassword,
    bool TrustServerCertificate,
    ErpDimensionUnit DimensionUnit,
    ErpWeightUnit WeightUnit,
    bool? LastTestSucceeded,
    DateTime? LastTestedAt)
{
    public static ErpSettingsResponse FromEntity(ErpSettingsEntity settings)
    {
        var isCurrent = settings.HasCurrentConnectionTest();
        return new ErpSettingsResponse(
            settings.Id,
            settings.ProviderType,
            settings.CompanyCode,
            settings.Username,
            settings.ServerAddress,
            HasPassword: !string.IsNullOrEmpty(settings.PasswordEncrypted),
            settings.TrustServerCertificate,
            settings.DimensionUnit,
            settings.WeightUnit,
            isCurrent ? settings.LastTestSucceeded : null,
            isCurrent ? settings.LastTestedAtUtc : null);
    }
}
