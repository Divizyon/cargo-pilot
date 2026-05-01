using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Araç (vehicle) yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/vehicles")]
[Tags("Vehicles")]
[Authorize]
public sealed class VehiclesController : BaseController
{
    private readonly IMediator _mediator;

    public VehiclesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Araçları arar ve sayfalı döndürür. isExport=true ile tüm kayıtlar pagination olmadan döner.
    /// </summary>
    /// <param name="searchTerm">Araç adı veya plaka arama terimi (opsiyonel).</param>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20). isExport=true ise göz ardı edilir.</param>
    /// <param name="isExport">Tüm kayıtları pagination olmadan döndürmek için true geçin.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Arama sonuçları döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool isExport = false,
        CancellationToken cancellationToken = default)
    {
        var query = new SearchVehiclesQuery(searchTerm, page, pageSize, isExport);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }
}
