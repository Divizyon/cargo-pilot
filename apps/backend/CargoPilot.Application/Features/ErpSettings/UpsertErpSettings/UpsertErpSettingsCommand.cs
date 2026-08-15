using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

/// <summary>
/// <paramref name="TrustServerCertificate"/> false ise ERP sunucusunun TLS sertifikasi
/// dogrulanir; alan gonderilmezse guvenli taraf (false) secilir.
/// <paramref name="DimensionUnit"/> ve <paramref name="WeightUnit"/> ERP'deki olcu ve
/// agirlik kolonlarinin biriminidir; ERP bu bilgiyi tasimadigi icin kurulumda bildirilir.
/// </summary>
public record UpsertErpSettingsCommand(
    ErpProviderType ProviderType,
    string CompanyCode,
    string Username,
    string ServerAddress,
    string? Password,
    bool TrustServerCertificate = false,
    ErpDimensionUnit DimensionUnit = ErpDimensionUnit.Centimeter,
    ErpWeightUnit WeightUnit = ErpWeightUnit.Kilogram) : IRequest<Result<ErpSettingsResponse>>;
