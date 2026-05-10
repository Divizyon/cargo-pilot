using CargoPilot.Application.Features.Integrations.ApplyErpConstraints;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Application.Features.Integrations.ListIntegrations;
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
[Authorize(Policy = "CompanyMember")]
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
    [ProducesResponseType(StatusCodes.Status200OK)]
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
    [ProducesResponseType(StatusCodes.Status200OK)]
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
    /// ERP ürün kısıt verilerini Cargo Pilot kural alanlarına eşler ve Item kayıtlarını günceller.
    /// Eşleşemeyen veya kısıt verisi eksik ürünler IsRuleAssigned=false olarak işaretlenir.
    /// Sync sonucu kural atanan/atanmayan sayaçlarıyla birlikte döner.
    /// </summary>
    /// <param name="id">Integration ID.</param>
    /// <param name="products">ERP ürün kısıt listesi.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Eşleştirme tamamlandı; işlenen, kural atanan, atanmayan ve eşleşmeyen ürün sayıları döner.</response>
    /// <response code="400">Boş liste gönderildi.</response>
    /// <response code="404">Integration bulunamadı.</response>
    [HttpPost("{id:guid}/apply-constraints")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApplyConstraints(
        [FromRoute] Guid id,
        [FromBody] List<ErpProductConstraintInput> products,
        CancellationToken cancellationToken)
    {
        var command = new ApplyErpConstraintsCommand(id, products);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
