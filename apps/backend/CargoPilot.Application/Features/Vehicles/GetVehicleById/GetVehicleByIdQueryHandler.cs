using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
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
        {
            return Result<VehicleDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));
        }

        AuditUserDto? createdBy = null;
        if (vehicle.CreatedBy.HasValue)
        {
            var user = await _userRepository.GetByIdAsync(vehicle.CreatedBy.Value, cancellationToken);
            if (user is not null)
                createdBy = new AuditUserDto(user.Id, $"{user.FirstName} {user.LastName}");
        }

        AuditUserDto? updatedBy = null;
        if (vehicle.UpdatedBy.HasValue)
        {
            var user = await _userRepository.GetByIdAsync(vehicle.UpdatedBy.Value, cancellationToken);
            if (user is not null)
                updatedBy = new AuditUserDto(user.Id, $"{user.FirstName} {user.LastName}");
        }

        var dto = new VehicleDetailDto(
            vehicle.Id,
            vehicle.VehicleName,
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