using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

/// <summary>
/// <paramref name="TrustServerCertificate"/> false ise sunucu sertifikasi dogrulanir;
/// eski istemciler alani gondermezse varsayilan davranis (true) korunur.
/// <paramref name="Password"/> bos gonderilirse kayitli baglantinin sifresiyle test edilir.
/// </summary>
public record TestErpConnectionCommand(
    ErpProviderType ProviderType,
    string ServerAddress,
    string CompanyCode,
    string Username,
    string? Password,
    bool TrustServerCertificate = true) : IRequest<Result<ErpConnectionTestResponse>>;
