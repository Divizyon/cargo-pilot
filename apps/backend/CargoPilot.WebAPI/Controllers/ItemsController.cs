using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Application.Features.Items.SearchItems;
using CargoPilot.Domain.Enums;
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
public sealed class ItemsController : BaseController {
    private readonly IMediator _mediator;

    public ItemsController(IMediator mediator) {
        _mediator = mediator;
    }

    /// <summary>
    /// Ürünleri arar ve sayfalı döndürür.
    /// </summary>
    /// <param name="searchTerm">Ürün adı veya SKU arama terimi (opsiyonel).</param>
    /// <param name="category">Ürün kategorisi filtresi: 0=Package, 1=Pallet, 2=Box (opsiyonel).</param>
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
        [FromQuery] ItemCategory? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) {
        var query = new SearchItemsQuery(searchTerm, category, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
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
        CancellationToken cancellationToken) {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);

        return HandleResult(result);
    }
}
