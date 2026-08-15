using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

/// <summary>
/// ERP urun senkronizasyonu. <paramref name="CompanyIdOverride"/> yalnizca arka plan
/// zamanlayicisi icindir: HTTP baglami olmadigi icin sirket kimligi cagirandan gelir.
/// HTTP uzerinden gelen isteklerde daima null birakilir; controller bu alani doldurmaz.
/// </summary>
public sealed record SyncErpItemsCommand(
    Guid IntegrationId,
    string? CategoryFilter,
    string? WarehouseFilter,
    Guid? CompanyIdOverride = null) : IRequest<Result<SyncErpItemsResult>>;
