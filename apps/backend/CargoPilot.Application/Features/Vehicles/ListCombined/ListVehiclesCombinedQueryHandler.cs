using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.ListCombined;

public sealed class ListVehiclesCombinedQueryHandler : IRequestHandler<ListVehiclesCombinedQuery, Result<PagedResult<VehicleCombinedItemDto>>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IValidator<ListVehiclesCombinedQuery> _validator;

    public ListVehiclesCombinedQueryHandler(
        IVehicleRepository vehicleRepository,
        IValidator<ListVehiclesCombinedQuery> validator) {
        _vehicleRepository = vehicleRepository;
        _validator = validator;
    }

    public async Task<Result<PagedResult<VehicleCombinedItemDto>>> Handle(
        ListVehiclesCombinedQuery request,
        CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PagedResult<VehicleCombinedItemDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var pagedVehicles = await _vehicleRepository.SearchAsync(
            request.SearchTerm,
            vehicleType: null,
            isActive: null,
            request.Page,
            request.PageSize,
            cancellationToken);

        var dtos = pagedVehicles.Items
            .Select(v => new VehicleCombinedItemDto(
                v.Id,
                v.VehicleName,
                v.VehicleType,
                v.PlateNumber,
                v.MaxWeightCapacity,
                v.Volume,
                v.LayerCount,
                v.IsActive))
            .ToList();

        var result = new PagedResult<VehicleCombinedItemDto>(
            dtos,
            pagedVehicles.TotalCount,
            pagedVehicles.Page,
            pagedVehicles.PageSize);

        return Result<PagedResult<VehicleCombinedItemDto>>.Success(result);
    }
}
