using CargoPilot.Application.Features.Plans.CreatePlan;
using CargoPilot.Application.Features.Plans.DeletePlan;
using CargoPilot.Application.Features.Plans.GetLoadingPlanReports;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using CargoPilot.Application.Features.Plans.UpdatePlanName;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Yükleme planı yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/loading-plans")]
[Tags("Plans")]
[Authorize(Policy = "CompanyMember")]
public sealed class PlansController : BaseController
{
    private readonly IMediator _mediator;

    public PlansController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Yükleme planlarını sayfalı, sıralı ve filtrelenmiş listeler.
    /// Dashboard için örnek: ?pageSize=7&amp;sortBy=createdAt&amp;sortDirection=desc
    /// Filtre örneği: ?plateNumber=34&amp;vehicleIds=guid1&amp;vehicleIds=guid2&amp;planDateStart=2025-01-01&amp;planDateEnd=2025-12-31
    /// </summary>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20).</param>
    /// <param name="sortBy">Sıralama alanı: createdAt, planName, fillRate, optimizationStatus (varsayılan: createdAt).</param>
    /// <param name="sortDirection">Sıralama yönü: asc veya desc (varsayılan: desc).</param>
    /// <param name="plateNumber">Araç plakasında serbest metin araması (opsiyonel).</param>
    /// <param name="vehicleIds">Belirli araçlara göre çoklu filtre (opsiyonel).</param>
    /// <param name="planDateStart">Plan oluşturma tarihi başlangıcı, dahil (opsiyonel).</param>
    /// <param name="planDateEnd">Plan oluşturma tarihi bitişi, dahil (opsiyonel).</param>
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
        [FromQuery] string? plateNumber = null,
        [FromQuery] List<Guid>? vehicleIds = null,
        [FromQuery] DateOnly? planDateStart = null,
        [FromQuery] DateOnly? planDateEnd = null,
        CancellationToken cancellationToken = default)
    {
        var query = new GetPlansQuery(page, pageSize, sortBy, sortDirection,
            plateNumber, vehicleIds?.AsReadOnly(), planDateStart, planDateEnd);
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

    /// <summary>
    /// Yeni bir yükleme planı oluşturur ve optimizasyon motorunu tetikler.
    /// </summary>
    /// <param name="command">Plan adı, araç ID'si ve item listesi.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="201">Plan oluşturuldu; yeni planın ID'si döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Araç bulunamadı.</response>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePlan(
        [FromBody] CreatePlanCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (!result.IsSuccess) return HandleResult(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data }, result.Data);
    }

    /// <summary>
    /// Yükleme planının adını günceller.
    /// </summary>
    /// <param name="id">Güncellenecek planın ID'si.</param>
    /// <param name="request">Yeni plan adı.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan adı güncellendi.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Plan bulunamadı.</response>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePlanName(
        [FromRoute] Guid id,
        [FromBody] UpdatePlanNameRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new UpdatePlanNameCommand(id, request.PlanName), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Geçmiş yükleme planı raporlarını filtreli ve sayfalı listeler.
    /// </summary>
    /// <param name="startDate">Başlangıç tarihi (UTC, opsiyonel).</param>
    /// <param name="endDate">Bitiş tarihi (UTC, opsiyonel).</param>
    /// <param name="vehicleId">Araç ID filtresi (opsiyonel).</param>
    /// <param name="minFillRate">Minimum doluluk oranı, 0-100 arası (opsiyonel).</param>
    /// <param name="maxFillRate">Maksimum doluluk oranı, 0-100 arası (opsiyonel).</param>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Rapor listesi sayfalı döner; sonuç yoksa boş liste ile totalCount=0 döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpGet("reports")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetReports(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] Guid? vehicleId = null,
        [FromQuery] decimal? minFillRate = null,
        [FromQuery] decimal? maxFillRate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetLoadingPlanReportsQuery(startDate, endDate, vehicleId, minFillRate, maxFillRate, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Yükleme planını soft-delete ile siler.
    /// </summary>
    /// <param name="id">Silinecek planın ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan silindi.</response>
    /// <response code="404">Plan bulunamadı.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlan(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new DeletePlanCommand(id), cancellationToken);
        return HandleResult(result);
    }
}

/// <summary>
/// PATCH /api/v1/loading-plans/{id} için request body.
/// </summary>
public sealed record UpdatePlanNameRequest(string PlanName);
