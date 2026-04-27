using CargoPilot.Application.Features.Items.CreateItem;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Ürün (item) yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/items")]
[Tags("Items")]
[Authorize]
public sealed class ItemsController : BaseController
{
    private readonly IMediator _mediator;

    public ItemsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Yeni ürün oluşturur.
    /// </summary>
    /// <response code="201">Ürün oluşturuldu; oluşturulan ürünün Id'si döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="409">Bu SKU zaten kullanımda.</response>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateItem(
        [FromBody] CreateItemCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);

        return HandleResult(result);
    }
}
