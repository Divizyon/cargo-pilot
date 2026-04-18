using CargoPilot.Application.Features.Cargos.CreateCargo;
using CargoPilot.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

[ApiController]
[Route("cargos")]
public class CargosController : ControllerBase
{
    private readonly CreateCargoUseCase _createCargoUseCase;

    public CargosController(CreateCargoUseCase createCargoUseCase)
    {
        _createCargoUseCase = createCargoUseCase;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCargoRequest request, CancellationToken cancellationToken)
    {
        Result<CreateCargoResponse> result = await _createCargoUseCase.ExecuteAsync(request, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(result.Error);
        }

        return Ok(result.Data);
    }
}

