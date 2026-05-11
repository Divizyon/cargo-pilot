using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.UpsertVehicleFromErp;

internal sealed class UpsertVehicleFromErpCommandHandler : IRequestHandler<UpsertVehicleFromErpCommand, Result<ErpVehicleSyncResultDto>>
{
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpsertVehicleFromErpCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService)
    {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ErpVehicleSyncResultDto>> Handle(
        UpsertVehicleFromErpCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        int added = 0, updated = 0, skipped = 0;

        foreach (var item in request.Vehicles)
        {
            try
            {
                var existing = await _vehicleRepository.GetByErpIdAsync(
                    item.ErpId,
                    request.IntegrationId,
                    companyId,
                    cancellationToken);

                if (existing is not null)
                {
                    existing.Update(
                        item.VehicleName,
                        item.Description,
                        item.VehicleType,
                        item.PlateNumber,
                        item.InternalWidth,
                        item.InternalHeight,
                        item.InternalLength,
                        item.MaxWeightCapacity,
                        item.KingPinDistanceMm,
                        item.KingPinTareWeightKg,
                        item.KingPinMaxLoadKg,
                        item.MainAxleDistanceMm,
                        item.MainAxleTareWeightKg,
                        item.MainAxleMaxLoadKg,
                        item.AdditionalAxleDistanceMm,
                        item.AdditionalAxleTareWeightKg,
                        item.AdditionalAxleMaxLoadKg,
                        item.LayerCount,
                        item.LoadingType,
                        true);

                    existing.SetErpSource(item.ErpId, request.IntegrationId);
                    updated++;
                }
                else
                {
                    var vehicle = new Vehicle(
                        Guid.NewGuid(),
                        item.VehicleName,
                        item.VehicleType,
                        item.PlateNumber,
                        item.InternalWidth,
                        item.InternalHeight,
                        item.InternalLength,
                        item.MaxWeightCapacity,
                        item.KingPinDistanceMm,
                        item.KingPinTareWeightKg,
                        item.KingPinMaxLoadKg,
                        item.MainAxleDistanceMm,
                        item.MainAxleTareWeightKg,
                        item.MainAxleMaxLoadKg,
                        item.AdditionalAxleDistanceMm,
                        item.AdditionalAxleTareWeightKg,
                        item.AdditionalAxleMaxLoadKg,
                        item.LayerCount,
                        item.LoadingType,
                        companyId,
                        item.Description);

                    vehicle.SetErpSource(item.ErpId, request.IntegrationId);
                    _vehicleRepository.Add(vehicle);
                    added++;
                }
            }
            catch (InvalidOperationException)
            {
                skipped++;
            }
        }

        await _vehicleRepository.SaveChangesAsync(cancellationToken);
        return Result<ErpVehicleSyncResultDto>.Success(new ErpVehicleSyncResultDto(added, updated, skipped));
    }
}