using CargoPilot.Application.Features.Vehicles.CreateVehicle;
using CargoPilot.Application.Features.Vehicles.DuplicateVehicle;
using CargoPilot.Application.Features.Vehicles.GetVehicleById;
using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using CargoPilot.Application.Features.Vehicles.UpdateVehicle;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Araç yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/vehicles")]
[Tags("Vehicles")]
[Authorize]
public sealed class VehiclesController : BaseController
{
    private readonly IMediator _mediator;

    public VehiclesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Araçları arar ve sayfalı döndürür.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] VehicleType? vehicleType,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new SearchVehiclesQuery(searchTerm, vehicleType, isActive, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Yeni bir araç oluşturur.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateVehicleRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new CreateVehicleCommand(
            request.VehicleName,
            request.VehicleType,
            request.PlateNumber,
            request.InternalWidth,
            request.InternalHeight,
            request.InternalLength,
            request.MaxWeightCapacity,
            request.LayerCount,
            request.LoadingType,
            request.KingPinDistanceMm,
            request.KingPinTareWeightKg,
            request.KingPinMaxLoadKg,
            request.MainAxleDistanceMm,
            request.MainAxleTareWeightKg,
            request.MainAxleMaxLoadKg,
            request.AdditionalAxleDistanceMm,
            request.AdditionalAxleTareWeightKg,
            request.AdditionalAxleMaxLoadKg);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);
        return HandleResult(result);
    }

    /// <summary>
    /// Mevcut bir aracı günceller.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        [FromRoute] Guid id,
        [FromBody] UpdateVehicleRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new UpdateVehicleCommand(
            id,
            request.VehicleName,
            request.VehicleType,
            request.PlateNumber,
            request.InternalWidth,
            request.InternalHeight,
            request.InternalLength,
            request.MaxWeightCapacity,
            request.LayerCount,
            request.LoadingType,
            request.KingPinDistanceMm,
            request.KingPinTareWeightKg,
            request.KingPinMaxLoadKg,
            request.MainAxleDistanceMm,
            request.MainAxleTareWeightKg,
            request.MainAxleMaxLoadKg,
            request.AdditionalAxleDistanceMm,
            request.AdditionalAxleTareWeightKg,
            request.AdditionalAxleMaxLoadKg);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Mevcut bir aracı kopyalar.
    /// </summary>
    [HttpPost("{id:guid}/duplicate")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Duplicate(
        [FromRoute] Guid id,
        [FromBody] DuplicateVehicleRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new DuplicateVehicleCommand(id, request.VehicleName, request.PlateNumber);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);
        return HandleResult(result);
    }

    /// <summary>
    /// ID ile tek bir aracı getirir.
    /// </summary>
    /// <response code="200">Araç detayları döner.</response>
    /// <response code="404">Araç bulunamadı.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetVehicleByIdQuery(id), cancellationToken);
        return HandleResult(result);
    }
}