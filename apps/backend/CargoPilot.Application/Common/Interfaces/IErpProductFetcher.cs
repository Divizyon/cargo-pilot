using CargoPilot.Application.Common.Erp;

namespace CargoPilot.Application.Common.Interfaces;

public interface IErpProductFetcher
{
    Task<IReadOnlyList<ErpProductDto>> FetchAsync(
        string apiEndpoint,
        string? authCredentialsJson,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default);
}
