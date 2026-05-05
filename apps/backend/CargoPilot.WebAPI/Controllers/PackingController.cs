using CargoPilot.Application.Features.Packing.DTOs;
using CargoPilot.Application.Features.Packing.OptimizePacking;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

[Authorize]
[Route("api/packing")]
public sealed class PackingController : BaseController
{
    private readonly IMediator _mediator;

    public PackingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// 3D Bin Packing optimizasyonunu çalıştırır.
    /// Konteyner, ürün listesi ve parametreler body'den alınır.
    /// </summary>
    [HttpPost("optimize")]
    [ProducesResponseType(typeof(PackingResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Optimize(
        [FromBody] OptimizePackingCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }


}
