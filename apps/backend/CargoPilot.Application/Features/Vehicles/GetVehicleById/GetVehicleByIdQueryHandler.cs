using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.GetVehicleById;

internal sealed class GetVehicleByIdQueryHandler : IRequestHandler<GetVehicleByIdQuery, Result<VehicleDetailDto>>
{
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IUserRepository _userRepository;

    public GetVehicleByIdQueryHandler(
        IVehicleRepository vehicleRepository,
        IUserRepository userRepository)
    {
        _vehicleRepository = vehicleRepository;
        _userRepository = userRepository;
    }

    public async Task<Result<VehicleDetailDto>> Handle(
        GetVehicleByIdQuery request,
        CancellationToken cancellationToken)
    {
        var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, cancellationToken);

        if (vehicle is null)
            return Result<VehicleDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        var auditIds = new List<Guid>();
        if (vehicle.CreatedBy.HasValue) auditIds.Add(vehicle.CreatedBy.Value);
        if (vehicle.UpdatedBy.HasValue) auditIds.Add(vehicle.UpdatedBy.Value);

        var userMap = auditIds.Count > 0
            ? await _userRepository.GetByIdsAsync(auditIds, cancellationToken)
            : new Dictionary<Guid, Domain.Entities.AppUser>();

        AuditUserDto? createdBy = null;
        if (vehicle.CreatedBy.HasValue && userMap.TryGetValue(vehicle.CreatedBy.Value, out var createdUser))
            createdBy = new AuditUserDto($"{createdUser.FirstName} {createdUser.LastName}", createdUser.Email);

        AuditUserDto? updatedBy = null;
        if (vehicle.UpdatedBy.HasValue && userMap.TryGetValue(vehicle.UpdatedBy.Value, out var updatedUser))
            updatedBy = new AuditUserDto($"{updatedUser.FirstName} {updatedUser.LastName}", updatedUser.Email);

        var dto = new VehicleDetailDto(
            vehicle.Id,
            vehicle.VehicleName,
            vehicle.Description,
            vehicle.VehicleType.ToString(),
            vehicle.PlateNumber,
            vehicle.InternalWidth,
            vehicle.InternalHeight,
            vehicle.InternalLength,
            vehicle.MaxWeightCapacity,
            vehicle.KingPinDistanceMm,
            vehicle.KingPinTareWeightKg,
            vehicle.KingPinMaxLoadKg,
            vehicle.MainAxleDistanceMm,
            vehicle.MainAxleTareWeightKg,
            vehicle.MainAxleMaxLoadKg,
            vehicle.AdditionalAxleDistanceMm,
            vehicle.AdditionalAxleTareWeightKg,
            vehicle.AdditionalAxleMaxLoadKg,
            vehicle.LayerCount,
            vehicle.LoadingType.ToString(),
            vehicle.CompanyId,
            vehicle.Volume,
            vehicle.IsActive,
            vehicle.CreatedAtUtc,
            vehicle.UpdatedAtUtc,
            createdBy,
            updatedBy);

        return Result<VehicleDetailDto>.Success(dto);
    }
}