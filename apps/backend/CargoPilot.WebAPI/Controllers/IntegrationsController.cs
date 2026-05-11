using CargoPilot.Application.Features.Integrations.ApprovePendingVehicleMapping;
using CargoPilot.Application.Features.Vehicles.UpsertVehicleFromErp;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using CargoPilot.Application.Features.Integrations.GetPendingVehicleMappings;
using CargoPilot.Application.Features.Integrations.DeletePendingVehicleMapping;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// ERP entegrasyon endpoint'leri.
/// </summary>
[Route("api/v1/integrations")]
[Tags("Integrations")]
[Authorize]
public sealed class IntegrationsController : BaseController
{
    private readonly IMediator _mediator;

    public IntegrationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// ERP'den gelen araç listesini senkronize eder.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="request">ERP araç listesi.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Senkronizasyon tamamlandı; added/updated/skipped sayaçları döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpPost("{id:guid}/vehicles/sync")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SyncVehicles(
        [FromRoute] Guid id,
        [FromBody] IReadOnlyList<UpsertVehicleFromErpRequest> request,
        CancellationToken cancellationToken = default)
    {
        var command = new UpsertVehicleFromErpCommand(id, request);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    /// <summary>
    /// Entegrasyona ait bekleyen araç mapping'lerini listeler.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Bekleyen mapping listesi döner.</response>
    [HttpGet("{id:guid}/vehicles/pending")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingVehicleMappings(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var query = new GetPendingVehicleMappingsQuery(id);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bekleyen bir araç mapping'ini siler.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="mappingId">Silinecek mapping ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Mapping silindi.</response>
    /// <response code="404">Mapping bulunamadı.</response>
    [HttpDelete("{id:guid}/vehicles/pending/{mappingId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePendingVehicleMapping(
        [FromRoute] Guid id,
        [FromRoute] Guid mappingId,
        CancellationToken cancellationToken = default)
    {
        var command = new DeletePendingVehicleMappingCommand(id, mappingId);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    /// <summary>
    /// Bekleyen bir araç mapping'ini onaylar ve Vehicle'a dönüştürür.
    /// </summary>
    /// <param name="id">Entegrasyon ID'si.</param>
    /// <param name="mappingId">Onaylanacak mapping ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="201">Araç oluşturuldu; ID döner.</response>
    /// <response code="404">Mapping bulunamadı.</response>
    [HttpPost("{id:guid}/vehicles/pending/{mappingId:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApprovePendingVehicleMapping(
        [FromRoute] Guid id,
        [FromRoute] Guid mappingId,
        CancellationToken cancellationToken = default)
    {
        var command = new ApprovePendingVehicleMappingCommand(id, mappingId);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);
        return HandleResult(result);
    }
}