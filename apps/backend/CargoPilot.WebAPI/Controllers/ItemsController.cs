using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Application.Features.Items.UpdateItem;
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

    /// <summary>
    /// Ürünü günceller.
    /// </summary>
    /// <param name="id">Güncellenecek ürünün ID'si.</param>
    /// <param name="command">Güncellenmiş ürün verileri.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Ürün başarıyla güncellendi; ürünün Id'si döner.</response>
    /// <response code="400">Doğrulama hatası (sayısal değerler pozitif değil vb.).</response>
    /// <response code="404">Ürün bulunamadı.</response>
    /// <response code="409">Bu SKU başka bir üründe zaten kullanılıyor.</response>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateItem(
        Guid id,
        [FromBody] UpdateItemCommand command,
        CancellationToken cancellationToken)
    {
        var commandWithId = command with { Id = id };
        var result = await _mediator.Send(commandWithId, cancellationToken);
        return HandleResult(result);
    }
}
