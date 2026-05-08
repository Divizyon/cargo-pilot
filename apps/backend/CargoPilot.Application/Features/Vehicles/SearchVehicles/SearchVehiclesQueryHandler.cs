using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed class SearchVehiclesQueryHandler : IRequestHandler<SearchVehiclesQuery, Result<PagedResult<VehicleSummaryDto>>>
{
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserVehicleFavoriteRepository _favoriteRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<SearchVehiclesQuery> _validator;

    public SearchVehiclesQueryHandler(
        IVehicleRepository vehicleRepository,
        IUserRepository userRepository,
        IUserVehicleFavoriteRepository favoriteRepository,
        ICurrentUserService currentUserService,
        IValidator<SearchVehiclesQuery> validator)
    {
        _vehicleRepository = vehicleRepository;
        _userRepository = userRepository;
        _favoriteRepository = favoriteRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<PagedResult<VehicleSummaryDto>>> Handle(
        SearchVehiclesQuery request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PagedResult<VehicleSummaryDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var (page, pageSize) = request.IsExport ? (1, int.MaxValue) : (request.Page, request.PageSize);

        IReadOnlyList<Guid>? favoriteIds = null;
        if (_currentUserService.UserId is { } userId)
        {
            favoriteIds = await _favoriteRepository.GetFavoriteVehicleIdsAsync(userId, cancellationToken);
        }

        var pagedVehicles = await _vehicleRepository.SearchAsync(
            request.SearchTerm,
            request.VehicleType,
            request.IsActive,
            request.OnlyFavorites,
            favoriteIds,
            page,
            pageSize,
            cancellationToken);

        var userIds = pagedVehicles.Items
            .Select(v => v.UpdatedBy ?? v.CreatedBy)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct();

        var userMap = await _userRepository.GetByIdsAsync(userIds, cancellationToken);

        var favoriteSet = favoriteIds is not null
            ? new HashSet<Guid>(favoriteIds)
            : new HashSet<Guid>();

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
                favoriteSet.Contains(v.Id),
                v.CompanyId,
                v.Description,
                v.KingPinDistanceMm,
                v.KingPinTareWeightKg,
                v.KingPinMaxLoadKg,
                v.MainAxleDistanceMm,
                v.MainAxleTareWeightKg,
                v.MainAxleMaxLoadKg,
                v.AdditionalAxleDistanceMm,
                v.AdditionalAxleTareWeightKg,
                v.AdditionalAxleMaxLoadKg,
                ResolveAuditUser(v, userMap),
                v.ErpId,
                v.IntegrationId))
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
        IReadOnlyDictionary<Guid, AppUser> userMap)
    {
        var userId = v.UpdatedBy ?? v.CreatedBy;
        if (userId is null || !userMap.TryGetValue(userId.Value, out var user))
            return null;

        return new AuditUserDto($"{user.FirstName} {user.LastName}".Trim(), user.Email);
    }
}
