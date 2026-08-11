using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

/// <summary>
/// <paramref name="TrustServerCertificate"/> false ise ERP sunucusunun TLS sertifikasi
/// dogrulanir; alan gonderilmezse mevcut varsayilan (true) korunur.
/// </summary>
public record UpsertErpSettingsCommand(
    ErpProviderType ProviderType,
    string CompanyCode,
    string Username,
    string ServerAddress,
    string? Password,
    bool TrustServerCertificate = true) : IRequest<Result<ErpSettingsResponse>>;
