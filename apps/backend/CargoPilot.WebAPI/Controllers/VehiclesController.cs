using CargoPilot.Application.Features.Vehicles.GetVehicleById;
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
    /// ID ile tek bir aracı getirir.
    /// </summary>
    /// <response code="200">Araç detayları döner.</response>
    /// <response code="404">Araç bulunamadı.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetVehicleByIdQuery(id), cancellationToken);
        return HandleResult(result);
    }
}