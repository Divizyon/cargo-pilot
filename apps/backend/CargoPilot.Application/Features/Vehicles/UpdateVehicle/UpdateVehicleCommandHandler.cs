using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.UpdateVehicle;

public sealed class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, Result<Guid>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpdateVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService) {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(UpdateVehicleCommand request, CancellationToken cancellationToken) {
        var companyId = _currentUserService.CompanyId;

        var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        if (request.PlateNumber is not null &&
            !string.Equals(vehicle.PlateNumber, request.PlateNumber, StringComparison.OrdinalIgnoreCase)) {
            var plateExists = await _vehicleRepository.ExistsByPlateNumberAsync(
                request.PlateNumber, companyId, request.Id, cancellationToken);
            if (plateExists)
                return Result<Guid>.Failure(
                    new Error(ErrorType.Conflict, "Vehicle.PlateNumberAlreadyExists", "Bu plaka zaten kullanımda."));
        }

        vehicle.Update(
            vehicleName: request.VehicleName,
            description: request.Description,
            vehicleType: request.VehicleType,
            plateNumber: request.PlateNumber,
            internalWidth: request.InternalWidth,
            internalHeight: request.InternalHeight,
            internalLength: request.InternalLength,
            maxWeightCapacity: request.MaxWeightCapacity,
            kingPinDistanceMm: request.KingPinDistanceMm,
            kingPinTareWeightKg: request.KingPinTareWeightKg,
            kingPinMaxLoadKg: request.KingPinMaxLoadKg,
            mainAxleDistanceMm: request.MainAxleDistanceMm,
            mainAxleTareWeightKg: request.MainAxleTareWeightKg,
            mainAxleMaxLoadKg: request.MainAxleMaxLoadKg,
            additionalAxleDistanceMm: request.AdditionalAxleDistanceMm,
            additionalAxleTareWeightKg: request.AdditionalAxleTareWeightKg,
            additionalAxleMaxLoadKg: request.AdditionalAxleMaxLoadKg,
            layerCount: request.LayerCount,
            loadingType: request.LoadingType,
            isActive: request.IsActive,
            isDraft: request.IsDraft ?? vehicle.IsDraft);

        // Kapi listesi yalnizca gonderildiginde degistirilir. Alan hic yoksa
        // istemci kapilara dokunmuyor demektir; bos liste gondermekle ayni sey
        // degil, o yuzden mevcut kapilar korunur.
        if (request.Doors is not null)
            vehicle.ReplaceDoors(request.Doors.Select(door => (door.Type, door.Face)));
        else
            DoorSetFactory.EnsureDoors(vehicle);

        // Kapi listesi asil kaynak; tekil alan ondan turetilir. Ikisi bagimsiz
        // yazilsaydi arac guncellendikce ayrisirlardi: motor kapilardan,
        // paylasim ve eski istemciler tekil alandan okuyor.
        vehicle.SyncLoadingTypeFromDoors();

        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }
}
