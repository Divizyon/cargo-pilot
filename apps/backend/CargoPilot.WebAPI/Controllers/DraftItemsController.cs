using CargoPilot.Application.Features.DraftItems.ApproveDraftItem;
using CargoPilot.Application.Features.DraftItems.ApproveDraftItems;
using CargoPilot.Application.Features.DraftItems.GetDraftItems;
using CargoPilot.Application.Features.DraftItems.ReinstateDraftItem;
using CargoPilot.Application.Features.DraftItems.RejectDraftItem;
using CargoPilot.Application.Features.DraftItems.UpdateDraftItem;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// ERP'den gelen taslak ürünlerin (DraftItem) yönetimi.
/// </summary>
[Route("api/v1/draft-items")]
[Tags("DraftItems")]
[Authorize(Policy = "CompanyMember")]
public sealed class DraftItemsController : BaseController
{
    private readonly IMediator _mediator;

    public DraftItemsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Taslak ürünleri sayfalı listeler.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] DraftItemStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetDraftItemsQuery(status, page, pageSize), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Taslak ürünün kullanıcı alanlarını günceller.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateDraftItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new UpdateDraftItemCommand(
            id,
            request.ProductType,
            request.Category,
            request.Width,
            request.Height,
            request.Length,
            request.Weight,
            request.Diameter,
            request.FragilityType,
            request.IsStackable,
            request.MaxStackCount,
            request.MaxWeightOnTop,
            request.AllowedRotations,
            request.Barcode,
            request.StackGroup,
            request.IncompatibleGroups,
            request.SpecialNotes,
            request.ConstraintIds);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Tek bir taslak ürünü onaylar; ana ürün tablosuna ekler.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new ApproveDraftItemCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Birden fazla taslak ürünü toplu onaylar.
    /// </summary>
    [HttpPost("approve-bulk")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ApproveBulk(
        [FromBody] ApproveDraftItemsRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new ApproveDraftItemsCommand(request.Ids), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Taslak ürünü reddeder.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new RejectDraftItemCommand(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Reddedilmiş taslağı tekrar beklemeye alır (ret kalıcıdır, geri alma yalnızca buradan yapılır).
    /// </summary>
    [HttpPost("{id:guid}/reinstate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reinstate(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new ReinstateDraftItemCommand(id), cancellationToken);
        return HandleResult(result);
    }
}

public sealed record UpdateDraftItemRequest(
    string ProductType,
    [property: System.Text.Json.Serialization.JsonRequired] ItemCategory Category,
    [property: System.Text.Json.Serialization.JsonRequired] decimal Width,
    [property: System.Text.Json.Serialization.JsonRequired] decimal Height,
    [property: System.Text.Json.Serialization.JsonRequired] decimal Length,
    [property: System.Text.Json.Serialization.JsonRequired] decimal Weight,
    decimal? Diameter,
    [property: System.Text.Json.Serialization.JsonRequired] FragilityType FragilityType,
    [property: System.Text.Json.Serialization.JsonRequired] bool IsStackable,
    [property: System.Text.Json.Serialization.JsonRequired] int MaxStackCount,
    [property: System.Text.Json.Serialization.JsonRequired] decimal MaxWeightOnTop,
    [property: System.Text.Json.Serialization.JsonRequired] AllowedRotations AllowedRotations,
    string? Barcode,
    string? StackGroup,
    string[]? IncompatibleGroups,
    string? SpecialNotes,
    int[]? ConstraintIds);

public sealed record ApproveDraftItemsRequest(IReadOnlyList<Guid> Ids);
