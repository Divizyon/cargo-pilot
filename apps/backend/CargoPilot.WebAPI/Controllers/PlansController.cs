using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Yükleme planı yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/plans")]
[Tags("Plans")]
[Authorize]
public sealed class PlansController : BaseController
{
    private readonly IMediator _mediator;

    public PlansController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Yükleme planlarını sayfalı ve sıralı listeler.
    /// Dashboard için örnek: ?pageSize=7&amp;sortBy=createdAt&amp;sortDirection=desc
    /// </summary>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20).</param>
    /// <param name="sortBy">Sıralama alanı: createdAt, planName, fillRate, optimizationStatus (varsayılan: createdAt).</param>
    /// <param name="sortDirection">Sıralama yönü: asc veya desc (varsayılan: desc).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan listesi sayfalı döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPlans(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortDirection = "desc",
        CancellationToken cancellationToken = default)
    {
        var query = new GetPlansQuery(page, pageSize, sortBy, sortDirection);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// ID ile tek bir yükleme planını tüm detaylarıyla getirir.
    /// Vehicle, placements (item dahil), unplaced items ve warnings içerir.
    /// </summary>
    /// <param name="id">Yükleme planının ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan detayları döner.</response>
    /// <response code="404">Plan bulunamadı.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetPlanByIdQuery(id), cancellationToken);
        return HandleResult(result);
    }
}
