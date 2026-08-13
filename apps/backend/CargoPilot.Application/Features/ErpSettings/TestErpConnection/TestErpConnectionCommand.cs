using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

/// <summary>
/// <paramref name="TrustServerCertificate"/> false ise sunucu sertifikasi dogrulanir;
/// alan gonderilmezse guvenli taraf (false) secilir.
/// <paramref name="Password"/> bos gonderilirse yalnizca istek kayitli baglantinin
/// aynisini hedefliyorsa kayitli sifreyle test edilir.
/// </summary>
public record TestErpConnectionCommand(
    ErpProviderType ProviderType,
    string ServerAddress,
    string CompanyCode,
    string Username,
    string? Password,
    bool TrustServerCertificate = false) : IRequest<Result<ErpConnectionTestResponse>>;
