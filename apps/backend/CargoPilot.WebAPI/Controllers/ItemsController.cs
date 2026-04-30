using CargoPilot.Application.Features.Items.BulkImportItems;
using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Application.Features.Items.DeleteItem;
using CargoPilot.Application.Features.Items.GetItemById;
using CargoPilot.Application.Features.Items.SearchItems;
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
public sealed class ItemsController : BaseController {
    private readonly IMediator _mediator;

    public ItemsController(IMediator mediator) {
        _mediator = mediator;
    }

    /// <summary>
    /// Ürünleri arar ve sayfalı döndürür.
    /// </summary>
    /// <param name="searchTerm">Ürün adı veya SKU arama terimi (opsiyonel).</param>
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
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) {
        var query = new SearchItemsQuery(searchTerm, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// ID ile tek bir ürünü getirir.
    /// </summary>
    /// <param name="id">Getirilecek ürünün ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Ürün detayları döner.</response>
    /// <response code="404">Ürün bulunamadı.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default) {
        var result = await _mediator.Send(new GetItemByIdQuery(id), cancellationToken);
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

    /// <summary>
    /// Ürünü siler (soft delete). Aktif bir sevkiyat planında kullanılan ürünler silinemez.
    /// </summary>
    /// <response code="200">Ürün başarıyla silindi.</response>
    /// <response code="404">Ürün bulunamadı.</response>
    /// <response code="409">Ürün aktif bir sevkiyat planında kullanıldığı için silinemez.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteItem(
        [FromRoute] Guid id,
        CancellationToken cancellationToken) {
        var result = await _mediator.Send(new DeleteItemCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Excel (.xlsx) dosyasından toplu ürün içe aktarır.
    /// </summary>
    /// <param name="file">.xlsx formatında ürün listesi dosyası.</param>
    /// <param name="updateExisting">true ise mevcut SKU'lar güncellenir; false ise atlanır (varsayılan: false).</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">İçe aktarma tamamlandı; başarı ve hata detayları döner.</response>
    /// <response code="400">Dosya .xlsx değil veya zorunlu kolonlar eksik.</response>
    [HttpPost("bulk-import")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(BulkImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(BulkImportResultDto), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkImport(
        IFormFile file,
        [FromQuery] bool updateExisting = false,
        CancellationToken cancellationToken = default) {
        if (file is null || !file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Yalnızca .xlsx uzantılı dosyalar kabul edilmektedir.");

        await using var stream = file.OpenReadStream();
        var command = new BulkImportItemsCommand(stream, updateExisting);
        var result = await _mediator.Send(command, cancellationToken);

        if (!result.IsSuccess)
            return HandleResult(result);

        var dto = result.Data!;

        if (dto.SuccessCount == 0 && dto.ErrorCount > 0)
            return UnprocessableEntity(result);   // 422 — hiçbir satır kaydedilemedi

        return Ok(result);   // 200 — tam veya kısmi başarı
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
        CancellationToken cancellationToken) {
        var commandWithId = command with { Id = id };
        var result = await _mediator.Send(commandWithId, cancellationToken);
        return HandleResult(result);
    }
}
