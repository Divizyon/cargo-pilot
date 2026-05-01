using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.GetVehicleById;

internal sealed class GetVehicleByIdQueryHandler : IRequestHandler<GetVehicleByIdQuery, Result<VehicleDetailDto>>
{
    private readonly IVehicleRepository _vehicleRepository;

    public GetVehicleByIdQueryHandler(IVehicleRepository vehicleRepository)
    {
        _vehicleRepository = vehicleRepository;
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
            vehicle.CreatedAtUtc,
            vehicle.UpdatedAtUtc,
            vehicle.CreatedBy,
            vehicle.UpdatedBy);

        return Result<VehicleDetailDto>.Success(dto);
    }
}