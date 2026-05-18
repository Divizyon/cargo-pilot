using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using CargoPilot.Domain.Entities;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.GetVehicleById;

public sealed class GetVehicleByIdQueryHandler : IRequestHandler<GetVehicleByIdQuery, Result<VehicleDetailDto>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetVehicleByIdQueryHandler(
        IVehicleRepository vehicleRepository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService) {
        _vehicleRepository = vehicleRepository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<VehicleDetailDto>> Handle(
        GetVehicleByIdQuery request,
        CancellationToken cancellationToken) {
        var vehicle = await _vehicleRepository.GetByIdAsync(
            request.Id,
            _currentUserService.CompanyId,
            cancellationToken);

        if (vehicle is null)
            return Result<VehicleDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        var userIds = new[] { vehicle.CreatedBy, vehicle.UpdatedBy }
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct();

        var userMap = await _userRepository.GetByIdsAsync(userIds, cancellationToken);

        string status = ResolveStatus(vehicle.IsDraft, vehicle.IsActive);
        var dto = new VehicleDetailDto(
            vehicle.Id,
            vehicle.VehicleName,
            vehicle.Description,
            vehicle.VehicleType,
            vehicle.PlateNumber,
            vehicle.InternalWidth,
            vehicle.InternalHeight,
            vehicle.InternalLength,
            vehicle.MaxWeightCapacity,
            vehicle.LayerCount,
            vehicle.LoadingType,
            vehicle.Volume,
            vehicle.IsActive,
            vehicle.CompanyId,
            vehicle.KingPinDistanceMm,
            vehicle.KingPinTareWeightKg,
            vehicle.KingPinMaxLoadKg,
            vehicle.MainAxleDistanceMm,
            vehicle.MainAxleTareWeightKg,
            vehicle.MainAxleMaxLoadKg,
            vehicle.AdditionalAxleDistanceMm,
            vehicle.AdditionalAxleTareWeightKg,
            vehicle.AdditionalAxleMaxLoadKg,
            vehicle.CreatedAtUtc,
            ResolveUser(vehicle.CreatedBy, userMap),
            vehicle.UpdatedAtUtc,
            ResolveUser(vehicle.UpdatedBy, userMap),
            status);

        return Result<VehicleDetailDto>.Success(dto);
    }

    private static AuditUserDto? ResolveUser(
        Guid? userId,
        IReadOnlyDictionary<Guid, AppUser> userMap) {
        if (userId is null || !userMap.TryGetValue(userId.Value, out var user))
            return null;

        return new AuditUserDto($"{user.FirstName} {user.LastName}".Trim(), user.Email);
    }

    private static string ResolveStatus(bool isDraft, bool isActive) {
        if (isDraft) return "taslak";
        if (isActive) return "active";
        return "pasif";
    }
}
