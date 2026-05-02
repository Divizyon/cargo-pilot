using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Araç yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/vehicles")]
[Tags("Vehicles")]
[Authorize]
public sealed class VehiclesController : BaseController {
    private readonly IMediator _mediator;

    public VehiclesController(IMediator mediator) {
        _mediator = mediator;
    }

    /// <summary>
    /// Araçları arar ve sayfalı döndürür.
    /// </summary>
    /// <param name="searchTerm">Araç adı veya plaka arama terimi (opsiyonel).</param>
    /// <param name="vehicleType">Araç tipi filtresi (opsiyonel).</param>
    /// <param name="isActive">Aktif/arşivlenmiş filtresi (opsiyonel).</param>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Arama sonuçları sayfalı döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] VehicleType? vehicleType,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) {
        var query = new SearchVehiclesQuery(searchTerm, vehicleType, isActive, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }
}
