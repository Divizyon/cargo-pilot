using CargoPilot.Application.Features.Shares.CreateShareLink;
using CargoPilot.Application.Features.Shares.DeleteShareLink;
using CargoPilot.Application.Features.Shares.GetShareLinks;
using CargoPilot.Application.Features.Shares.GetSharePlanByToken;
using CargoPilot.Application.Features.Shares.RecordShareView;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Yükleme planı paylaşım bağlantısı endpoint'leri.
/// </summary>
[Route("api/v1/shares")]
[Tags("Shares")]
public sealed class SharesController : BaseController
{
    private readonly IMediator _mediator;

    public SharesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Belirtilen plan için zaman sınırlı bir paylaşım bağlantısı oluşturur.
    /// </summary>
    /// <param name="request">PlanId ve geçerlilik süresi ('24h', '7d', 'unlimited').</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Paylaşım bağlantısı oluşturuldu.</response>
    /// <response code="400">Geçersiz istek.</response>
    /// <response code="401">Kimlik doğrulaması gereklidir.</response>
    /// <response code="404">Plan bulunamadı.</response>
    [HttpPost]
    [Authorize(Policy = "CompanyMember")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateShareLink(
        [FromBody] CreateShareLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new CreateShareLinkCommand(request.PlanId, request.Validity);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Şirketin oluşturduğu paylaşım bağlantılarını listeler.
    /// </summary>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Paylaşım bağlantıları döner.</response>
    /// <response code="401">Kimlik doğrulaması gereklidir.</response>
    [HttpGet]
    [Authorize(Policy = "CompanyMember")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetShareLinks(CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetShareLinksQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Paylaşım bağlantısını iptal eder; bağlantı bir daha açılamaz.
    /// </summary>
    /// <param name="id">Bağlantının ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Bağlantı iptal edildi.</response>
    /// <response code="401">Kimlik doğrulaması gereklidir.</response>
    /// <response code="404">Bağlantı bulunamadı.</response>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "CompanyMember")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteShareLink(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new DeleteShareLinkCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Token ile paylaşılan planın read-only görünüm verilerini döndürür.
    /// </summary>
    /// <param name="token">Paylaşım token'ı.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan verisi döner.</response>
    /// <response code="404">Bağlantı bulunamadı.</response>
    [HttpGet("{token}/plan")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSharePlan(
        [FromRoute] string token,
        CancellationToken cancellationToken = default)
    {
        var query = new GetSharePlanByTokenQuery(token);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Paylaşım bağlantısı için görüntülenme sayısını artırır.
    /// </summary>
    /// <param name="token">Paylaşım token'ı.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="204">Görüntülenme kaydedildi.</response>
    [HttpPost("{token}/view")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RecordView(
        [FromRoute] string token,
        CancellationToken cancellationToken = default)
    {
        await _mediator.Send(new RecordShareViewCommand(token), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateShareLinkRequest
{
    public required Guid PlanId { get; init; }
    public required string Validity { get; init; }
}
