using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Application.Features.Items.UpdateItem;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Ürün (Item) yönetimi endpoint'leri.
/// </summary>
[Route("api/products")]
[Tags("Products")]
[Authorize]
public sealed class ProductsController : BaseController
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Yeni ürün oluşturur.
    /// </summary>
    /// <response code="201">Ürün oluşturuldu.</response>
    /// <response code="400">Doğrulama hatası / SKU mükerrer.</response>
    [HttpPost]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateItemCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);

        return HandleResult(result);
    }

    /// <summary>
    /// Mevcut ürünü günceller.
    /// </summary>
    /// <response code="200">Güncelleme başarılı.</response>
    /// <response code="400">Doğrulama hatası / SKU mükerrer.</response>
    /// <response code="404">Ürün bulunamadı.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Result<Guid>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        [FromRoute] Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateItemCommand(
            Id: id,
            SKU: request.SKU,
            Barcode: request.Barcode,
            Name: request.Name,
            ProductType: request.ProductType,
            Category: request.Category,
            Width: request.Width,
            WidthUnit: request.WidthUnit,
            Height: request.Height,
            HeightUnit: request.HeightUnit,
            Length: request.Length,
            LengthUnit: request.LengthUnit,
            Diameter: request.Diameter,
            Weight: request.Weight,
            WeightUnit: request.WeightUnit,
            FragilityType: request.FragilityType,
            IsStackable: request.IsStackable,
            MaxStackCount: request.MaxStackCount,
            MaxWeightOnTop: request.MaxWeightOnTop,
            AllowedRotations: request.AllowedRotations,
            ImageUrl: request.ImageUrl,
            StackGroup: request.StackGroup,
            SpecialNotes: request.SpecialNotes);

        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    public sealed class UpdateProductRequest
    {
        public required string SKU { get; init; }
        public string? Barcode { get; init; }
        public required string Name { get; init; }
        public required string ProductType { get; init; }

        public required CargoPilot.Domain.Enums.ItemCategory Category { get; init; }

        public required decimal Width { get; init; }
        public required CargoPilot.Domain.Enums.LengthUnit WidthUnit { get; init; }
        public required decimal Height { get; init; }
        public required CargoPilot.Domain.Enums.LengthUnit HeightUnit { get; init; }
        public required decimal Length { get; init; }
        public required CargoPilot.Domain.Enums.LengthUnit LengthUnit { get; init; }
        public decimal? Diameter { get; init; }

        public required decimal Weight { get; init; }
        public required CargoPilot.Domain.Enums.WeightUnit WeightUnit { get; init; }

        public required CargoPilot.Domain.Enums.FragilityType FragilityType { get; init; }
        public required bool IsStackable { get; init; }
        public required int MaxStackCount { get; init; }
        public required decimal MaxWeightOnTop { get; init; }
        public required CargoPilot.Domain.Enums.AllowedRotations AllowedRotations { get; init; }

        public string? ImageUrl { get; init; }
        public string? StackGroup { get; init; }
        public string? SpecialNotes { get; init; }
    }
}

