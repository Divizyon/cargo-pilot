using CargoPilot.Application.Features.Integrations.GetSyncLogs;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Application.Features.Integrations.ListIntegrations;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using CargoPilot.Application.Features.Integrations.TriggerSync;
using CargoPilot.Application.Features.Integrations.UpdateSyncSettings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// ERP entegrasyon yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/integrations")]
[Tags("Integrations")]
public sealed class IntegrationsController : BaseController
{
    private readonly IMediator _mediator;

    public IntegrationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Şirkete ait entegrasyonları listeler.
    /// </summary>
    /// <response code="200">Entegrasyon listesi döner.</response>
    [HttpGet]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new ListIntegrationsQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Entegrasyona ait senkronizasyon geçmişini sayfalı olarak listeler.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Senkronizasyon geçmişi sayfalı döner.</response>
    /// <response code="404">Entegrasyon bulunamadı.</response>
    [HttpGet("{id:guid}/sync-logs")]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSyncLogs(
        [FromRoute] Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetSyncLogsQuery(id, page, pageSize), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Entegrasyonun senkronizasyon ayarlarını getirir.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Senkronizasyon ayarları döner.</response>
    /// <response code="404">Entegrasyon bulunamadı.</response>
    [HttpGet("{id:guid}/sync-settings")]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSyncSettings(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetSyncSettingsQuery(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Entegrasyonun senkronizasyon ayarlarını günceller.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="command">Güncellenecek senkronizasyon ayarları.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Ayarlar güncellendi; güncel senkronizasyon durumu döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Entegrasyon bulunamadı.</response>
    [HttpPut("{id:guid}/sync-settings")]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSyncSettings(
        [FromRoute] Guid id,
        [FromBody] UpdateSyncSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var commandWithId = command with { IntegrationId = id };
        var result = await _mediator.Send(commandWithId, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Entegrasyon için senkronizasyonu manuel olarak tetikler.
    /// Aynı entegrasyon için eş zamanlı ikinci tetikleme engellenir.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Senkronizasyon tamamlandı; güncel senkronizasyon durumu döner.</response>
    /// <response code="404">Entegrasyon bulunamadı.</response>
    /// <response code="409">Senkronizasyon zaten çalışıyor.</response>
    [HttpPost("{id:guid}/sync/run-now")]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RunNow(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new TriggerSyncCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// ERP'den ürünleri senkronize eder.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="categoryFilter">Kategori filtresi (opsiyonel).</param>
    /// <param name="warehouseFilter">Depo filtresi (opsiyonel).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Senkronizasyon tamamlandı, özet döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Entegrasyon bulunamadı.</response>
    [HttpPost("{id:guid}/items/sync")]
    [Authorize(Policy = "CompanyAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SyncItems(
        Guid id,
        [FromQuery] string? categoryFilter,
        [FromQuery] string? warehouseFilter,
        CancellationToken cancellationToken = default)
    {
        var command = new SyncErpItemsCommand(id, categoryFilter, warehouseFilter);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
