using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed class SearchVehiclesQueryHandler : IRequestHandler<SearchVehiclesQuery, Result<PagedResult<VehicleSummaryDto>>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IValidator<SearchVehiclesQuery> _validator;

    public SearchVehiclesQueryHandler(
        IVehicleRepository vehicleRepository,
        IValidator<SearchVehiclesQuery> validator) {
        _vehicleRepository = vehicleRepository;
        _validator = validator;
    }

    public async Task<Result<PagedResult<VehicleSummaryDto>>> Handle(
        SearchVehiclesQuery request,
        CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PagedResult<VehicleSummaryDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var pagedVehicles = await _vehicleRepository.SearchAsync(
            request.SearchTerm,
            request.VehicleType,
            request.IsActive,
            request.Page,
            request.PageSize,
            cancellationToken);

        var dtos = pagedVehicles.Items
            .Select(v => new VehicleSummaryDto(
                v.Id,
                v.VehicleName,
                v.VehicleType,
                v.PlateNumber,
                v.InternalWidth,
                v.InternalHeight,
                v.InternalLength,
                v.MaxWeightCapacity,
                v.LayerCount,
                v.LoadingType,
                v.Volume,
                v.IsActive,
                v.CompanyId))
            .ToList();

        var result = new PagedResult<VehicleSummaryDto>(
            dtos,
            pagedVehicles.TotalCount,
            pagedVehicles.Page,
            pagedVehicles.PageSize);

        return Result<PagedResult<VehicleSummaryDto>>.Success(result);
    }
}
