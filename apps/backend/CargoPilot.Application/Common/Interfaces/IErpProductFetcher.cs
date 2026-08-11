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

    /// <summary>
    /// Urunleri ceker ve ayni sorgu icinde kaynak toplamini + neden bazli eleme
    /// sayilarini dondurur (bkz. <see cref="ErpFetchResult"/>).
    /// </summary>
    Task<ErpFetchResult> FetchAsync(
        string serverAddress,
        ErpCredentials credentials,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default);
}
