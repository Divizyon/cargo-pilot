using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed class SearchVehiclesQueryHandler : IRequestHandler<SearchVehiclesQuery, Result<PagedResult<VehicleSummaryDto>>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IUserRepository _userRepository;
    private readonly IValidator<SearchVehiclesQuery> _validator;

    public SearchVehiclesQueryHandler(
        IVehicleRepository vehicleRepository,
        IUserRepository userRepository,
        IValidator<SearchVehiclesQuery> validator) {
        _vehicleRepository = vehicleRepository;
        _userRepository = userRepository;
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

        var (page, pageSize) = request.IsExport ? (1, int.MaxValue) : (request.Page, request.PageSize);

        var pagedVehicles = await _vehicleRepository.SearchAsync(
            request.SearchTerm,
            request.VehicleType,
            request.IsActive,
            page,
            pageSize,
            cancellationToken);

        var userIds = pagedVehicles.Items
            .Select(v => v.UpdatedBy ?? v.CreatedBy)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct();

        var userMap = await _userRepository.GetByIdsAsync(userIds, cancellationToken);

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
                v.CompanyId,
                ResolveAuditUser(v, userMap)))
            .ToList();

        var result = new PagedResult<VehicleSummaryDto>(
            dtos,
            pagedVehicles.TotalCount,
            pagedVehicles.Page,
            pagedVehicles.PageSize);

        return Result<PagedResult<VehicleSummaryDto>>.Success(result);
    }

    private static AuditUserDto? ResolveAuditUser(
        Vehicle v,
        IReadOnlyDictionary<Guid, AppUser> userMap) {
        var userId = v.UpdatedBy ?? v.CreatedBy;
        if (userId is null || !userMap.TryGetValue(userId.Value, out var user))
            return null;

        return new AuditUserDto($"{user.FirstName} {user.LastName}".Trim(), user.Email);
    }
}
