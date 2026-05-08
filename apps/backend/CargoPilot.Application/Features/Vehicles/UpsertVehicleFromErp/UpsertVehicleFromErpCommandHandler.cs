using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.UpsertVehicleFromErp;

internal sealed class UpsertVehicleFromErpCommandHandler : IRequestHandler<UpsertVehicleFromErpCommand, Result<Guid>>
{
    private readonly IVehicleRepository _vehicleRepository;

    public UpsertVehicleFromErpCommandHandler(IVehicleRepository vehicleRepository)
    {
        _vehicleRepository = vehicleRepository;
    }

    public async Task<Result<Guid>> Handle(
        UpsertVehicleFromErpCommand request,
        CancellationToken cancellationToken)
    {
        var existing = await _vehicleRepository.GetByErpIdAsync(
            request.ErpId,
            request.IntegrationId,
            cancellationToken);

        if (existing is not null)
        {
            existing.Update(
                request.VehicleName,
                request.Description,
                request.VehicleType,
                request.PlateNumber,
                request.InternalWidth,
                request.InternalHeight,
                request.InternalLength,
                request.MaxWeightCapacity,
                request.KingPinDistanceMm,
                request.KingPinTareWeightKg,
                request.KingPinMaxLoadKg,
                request.MainAxleDistanceMm,
                request.MainAxleTareWeightKg,
                request.MainAxleMaxLoadKg,
                request.AdditionalAxleDistanceMm,
                request.AdditionalAxleTareWeightKg,
                request.AdditionalAxleMaxLoadKg,
                request.LayerCount,
                request.LoadingType,
                true);

            existing.SetErpSource(request.ErpId, request.IntegrationId);
            await _vehicleRepository.SaveChangesAsync(cancellationToken);
            return Result<Guid>.Success(existing.Id);
        }

        var vehicle = new Vehicle(
            Guid.NewGuid(),
            request.VehicleName,
            request.VehicleType,
            request.PlateNumber,
            request.InternalWidth,
            request.InternalHeight,
            request.InternalLength,
            request.MaxWeightCapacity,
            request.KingPinDistanceMm,
            request.KingPinTareWeightKg,
            request.KingPinMaxLoadKg,
            request.MainAxleDistanceMm,
            request.MainAxleTareWeightKg,
            request.MainAxleMaxLoadKg,
            request.AdditionalAxleDistanceMm,
            request.AdditionalAxleTareWeightKg,
            request.AdditionalAxleMaxLoadKg,
            request.LayerCount,
            request.LoadingType,
            request.CompanyId,
            request.Description);

        vehicle.SetErpSource(request.ErpId, request.IntegrationId);
        _vehicleRepository.Add(vehicle);
        await _vehicleRepository.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(vehicle.Id);
    }
}