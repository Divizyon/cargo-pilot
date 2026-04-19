using CargoPilot.Application.Features.Cargos.CreateCargo;
using CargoPilot.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Kargo yönetimi API endpoint'leri.
/// </summary>
[ApiController]
[Route("cargos")]
[Tags("Cargos")]
public class CargosController : BaseController
{
    private readonly CreateCargoUseCase _createCargoUseCase;

    public CargosController(CreateCargoUseCase createCargoUseCase)
    {
        _createCargoUseCase = createCargoUseCase;
    }

    /// <summary>
    /// Yeni bir kargo kaydı oluşturur.
    /// </summary>
    /// <param name="request">Oluşturulacak kargonun bilgileri.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <returns>Oluşturulan kargonun detayları.</returns>
    /// <response code="200">Kargo başarıyla oluşturuldu.</response>
    /// <response code="400">Geçersiz istek verisi veya iş kuralı ihlali.</response>
    [HttpPost]
    [ProducesResponseType(typeof(Result<CreateCargoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<CreateCargoResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateCargoRequest request, CancellationToken cancellationToken)
    {
        Result<CreateCargoResponse> result = await _createCargoUseCase.ExecuteAsync(request, cancellationToken);

        return HandleResult(result);
    }
}
