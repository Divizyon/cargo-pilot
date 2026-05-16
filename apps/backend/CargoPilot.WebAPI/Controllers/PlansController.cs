using CargoPilot.Application.Features.Plans.ApprovePlan;
using CargoPilot.Application.Features.Plans.CreatePlan;
using CargoPilot.Application.Features.Plans.DeletePlan;
using CargoPilot.Application.Features.Plans.GetLoadingPlanReports;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using CargoPilot.Application.Features.Plans.Groups.AssignItemToGroup;
using CargoPilot.Application.Features.Plans.Groups.CreateGroup;
using CargoPilot.Application.Features.Plans.Groups.DeleteGroup;
using CargoPilot.Application.Features.Plans.Groups.UpdateGroup;
using CargoPilot.Application.Features.Plans.GetVehicleSuggestions;
using CargoPilot.Application.Features.Plans.ReOptimizePlan;
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
    /// Mevcut bir yükleme planını yeniden optimize eder. Araç, item listesi ve optimizasyon kriteri değiştirilebilir.
    /// Eski yerleştirme sonuçları silinir, yeni optimizasyon sonuçları kaydedilir.
    /// </summary>
    /// <param name="id">Yeniden optimize edilecek planın ID'si.</param>
    /// <param name="request">Yeni araç, item listesi ve optimizasyon kriteri.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan yeniden optimize edildi; plan ID'si döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Plan, araç veya item bulunamadı.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReOptimize(
        [FromRoute] Guid id,
        [FromBody] ReOptimizePlanRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new ReOptimizePlanCommand(id, request.VehicleIds, request.Items, request.OptimizationCriteria);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
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
    /// Hesaplanmış bir yükleme planını onaylar ve ERP aktarımını tetikler.
    /// </summary>
    /// <param name="id">Onaylanacak planın ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Plan onaylandı, ERP aktarımı kuyruğa alındı.</response>
    /// <response code="400">Plan hesaplanmış durumda değil.</response>
    /// <response code="404">Plan bulunamadı.</response>
    [HttpPost("{id:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApprovePlan(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new ApprovePlanCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Belirtilen yükleme planı altında yeni bir grup oluşturur.
    /// </summary>
    /// <param name="planId">Planın ID'si.</param>
    /// <param name="request">Grup adı, rengi ve boşaltma sırası.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="201">Grup oluşturuldu; yeni grubun ID'si döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Plan bulunamadı.</response>
    [HttpPost("{planId:guid}/groups")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateGroup(
        [FromRoute] Guid planId,
        [FromBody] CreateGroupRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new CreateGroupCommand(planId, request.Name, request.Color, request.UnloadingOrder);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result.IsSuccess) return HandleResult(result);
        return CreatedAtAction(nameof(GetById), new { id = planId }, result);
    }

    /// <summary>
    /// Belirtilen grubu günceller.
    /// </summary>
    /// <param name="planId">Planın ID'si.</param>
    /// <param name="groupId">Güncellenecek grubun ID'si.</param>
    /// <param name="request">Yeni grup adı, rengi ve boşaltma sırası.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Grup güncellendi.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Plan veya grup bulunamadı.</response>
    [HttpPut("{planId:guid}/groups/{groupId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateGroup(
        [FromRoute] Guid planId,
        [FromRoute] Guid groupId,
        [FromBody] UpdateGroupRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new UpdateGroupCommand(planId, groupId, request.Name, request.Color, request.UnloadingOrder);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Belirtilen grubu siler. moveItemsToNull true ise gruptaki ürünlerin grubu kaldırılır, false ise ürünler de silinir.
    /// </summary>
    /// <param name="planId">Planın ID'si.</param>
    /// <param name="groupId">Silinecek grubun ID'si.</param>
    /// <param name="request">moveItemsToNull parametresi.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Grup silindi.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Plan veya grup bulunamadı.</response>
    [HttpDelete("{planId:guid}/groups/{groupId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteGroup(
        [FromRoute] Guid planId,
        [FromRoute] Guid groupId,
        [FromBody] DeleteGroupRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new DeleteGroupCommand(planId, groupId, request.MoveItemsToNull);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bir ürünü gruba atar veya gruptan çıkarır. groupId null gönderilirse ürün gruptan çıkarılır.
    /// </summary>
    /// <param name="planId">Planın ID'si.</param>
    /// <param name="inputItemId">Güncellenecek InputItem'ın ID'si.</param>
    /// <param name="request">Atanacak grubun ID'si (null ise gruptan çıkarır).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Ürün gruba atandı veya gruptan çıkarıldı.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Plan, ürün veya grup bulunamadı.</response>
    [HttpPut("{planId:guid}/items/{inputItemId:guid}/group")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignItemToGroup(
        [FromRoute] Guid planId,
        [FromRoute] Guid inputItemId,
        [FromBody] AssignItemToGroupRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new AssignItemToGroupCommand(planId, inputItemId, request.GroupId);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Verilen ürün listesine göre şirketin aktif araçlarını hacim algoritmasıyla sıralayarak öneri döner.
    /// CanFitAll=true olanlar önce, ardından tahmini doluluk oranına göre sıralanır.
    /// </summary>
    /// <param name="request">Item ID ve miktar çiftlerinin listesi.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Araç önerileri sıralı liste olarak döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Bir veya daha fazla item bulunamadı.</response>
    [HttpPost("vehicle-suggestions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVehicleSuggestions(
        [FromBody] GetVehicleSuggestionsRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = new GetVehicleSuggestionsQuery(request.Items);
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

/// <summary>POST /groups request body.</summary>
public sealed record CreateGroupRequest(
    string Name,
    string Color,
    [property: System.Text.Json.Serialization.JsonRequired] int UnloadingOrder);

/// <summary>PUT /groups/{groupId} request body.</summary>
public sealed record UpdateGroupRequest(
    string Name,
    string Color,
    [property: System.Text.Json.Serialization.JsonRequired] int UnloadingOrder);

/// <summary>DELETE /groups/{groupId} request body.</summary>
public sealed record DeleteGroupRequest(
    [property: System.Text.Json.Serialization.JsonRequired] bool MoveItemsToNull);

/// <summary>PUT /items/{inputItemId}/group request body.</summary>
public sealed record AssignItemToGroupRequest(Guid? GroupId);

/// <summary>POST /vehicle-suggestions request body.</summary>
public sealed record GetVehicleSuggestionsRequest(IReadOnlyList<SuggestionItemRequest> Items);

