using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

/// <summary>
/// Saglayici-basina urun cekme stratejisi. Her ERP saglayicisi kendi semasina gore
/// ayri bir gerceklestirme kaydeder; kaydi olmayan saglayicida sync sessizce yanlis
/// sema sorgulamak yerine acik hata dondurur.
/// </summary>
public interface IErpProductFetcher
{
    ErpProviderType ProviderType { get; }

    Task<IReadOnlyList<ErpProductDto>> FetchAsync(
        string apiEndpoint,
        string? authCredentialsJson,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default);
}
