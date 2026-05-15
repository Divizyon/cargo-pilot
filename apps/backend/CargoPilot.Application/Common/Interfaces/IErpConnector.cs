using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IErpConnector
{
    ErpProviderType ProviderType { get; }

    Task<ErpConnectionResult> TestConnectionAsync(
        string serverAddress,
        string companyCode,
        string username,
        string password,
        CancellationToken cancellationToken = default);
}
