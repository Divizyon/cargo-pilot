using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Application.Features.Items.UpdateItem;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Ürün (Item) yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/items")]
[Tags("Items")]
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
    /// <response code="201">Ürün başarıyla oluşturuldu; yeni ürünün Id'si döner.</response>
    /// <response code="400">Doğrulama hatası (eksik alan, geçersiz değer vb.).</response>
    /// <response code="409">Bu SKU kodu zaten kullanımda.</response>
    [HttpPost]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateItemCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);

        return HandleResult(result);
    }

    /// <summary>
    /// Mevcut ürünü günceller.
    /// </summary>
    /// <param name="id">Güncellenecek ürünün Id'si.</param>
    /// <param name="command">Güncelleme verilerini içeren komut.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Ürün başarıyla güncellendi.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Ürün bulunamadı.</response>
    /// <response code="409">Bu SKU kodu başka bir ürün tarafından kullanılıyor.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateItemCommand command,
        CancellationToken cancellationToken)
    {
        if (id != command.Id)
        {
            return HandleResult(Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Item.IdMismatch", "URL'deki Id ile body'deki Id eşleşmiyor.")));
        }

        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
