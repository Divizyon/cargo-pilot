using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Application.Features.Items.DeleteItem;
using CargoPilot.Application.Features.Items.GetItemById;
using CargoPilot.Application.Features.Items.GetItems;
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
public sealed class ItemsController : BaseController
{
    private readonly IMediator _mediator;

    public ItemsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new SearchItemsQuery(searchTerm, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetItemByIdQuery(id), cancellationToken);
        return HandleResult(result);
    }

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

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteItem(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteItemCommand(id), cancellationToken);
        return HandleResult(result);
    }

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

    /// <summary>
    /// Ürün havuzunu listeler (Read-Only).
    /// </summary>
    [HttpGet("all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItems(
        [FromQuery] Guid? companyId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetItemsQuery(companyId, search, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }
}