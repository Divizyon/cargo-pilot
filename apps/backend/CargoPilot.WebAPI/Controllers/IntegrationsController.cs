using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Application.Features.Integrations.ListIntegrations;
using CargoPilot.Application.Features.Integrations.PendingItemMappings;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using CargoPilot.Application.Features.Integrations.TriggerSync;
using CargoPilot.Application.Features.Integrations.UpdateSyncSettings;
using CargoPilot.Domain.Enums;
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
    [Authorize(Policy = "CompanyAdminOrAbove")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new ListIntegrationsQuery(), cancellationToken);
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
    [Authorize(Policy = "CompanyAdminOrAbove")]
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
    [Authorize(Policy = "CompanyAdminOrAbove")]
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
    [Authorize(Policy = "CompanyAdminOrAbove")]
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
    [Authorize(Policy = "CompanyAdminOrAbove")]
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

    /// <summary>
    /// Bekleyen ERP ürün eşleştirmelerini listeler.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="status">Durum filtresi (opsiyonel): Pending=0, Approved=1, Dismissed=2.</param>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Bekleyen eşleştirme listesi sayfalı döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Entegrasyon bulunamadı.</response>
    [HttpGet("{id:guid}/pending-item-mappings")]
    [Authorize(Policy = "CompanyAdminOrAbove")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPendingItemMappings(
        Guid id,
        [FromQuery] PendingItemMappingStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetPendingItemMappingsQuery(id, status, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bekleyen bir ERP ürün eşleştirmesini onaylar.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="mappingId">Eşleştirme ID'si.</param>
    /// <param name="body">Bağlanacak Cargo Pilot ürün ID'sini içeren istek gövdesi.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Eşleştirme onaylandı.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Entegrasyon veya eşleştirme bulunamadı.</response>
    [HttpPut("{id:guid}/pending-item-mappings/{mappingId:guid}")]
    [Authorize(Policy = "CompanyAdminOrAbove")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApprovePendingItemMapping(
        Guid id,
        Guid mappingId,
        [FromBody] ApproveMappingRequest body,
        CancellationToken cancellationToken = default)
    {
        var command = new ApprovePendingItemMappingCommand(id, mappingId, body.CargoPilotItemId);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bekleyen bir ERP ürün eşleştirmesini reddeder (Dismissed olarak işaretler).
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="mappingId">Eşleştirme ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Eşleştirme reddedildi.</response>
    /// <response code="404">Entegrasyon veya eşleştirme bulunamadı.</response>
    [HttpDelete("{id:guid}/pending-item-mappings/{mappingId:guid}")]
    [Authorize(Policy = "CompanyAdminOrAbove")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePendingItemMapping(
        Guid id,
        Guid mappingId,
        CancellationToken cancellationToken = default)
    {
        var command = new DeletePendingItemMappingCommand(id, mappingId);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
