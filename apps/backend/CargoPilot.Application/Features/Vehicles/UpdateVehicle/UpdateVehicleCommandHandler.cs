using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.UpdateVehicle;

public sealed class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, Result<Guid>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IValidator<UpdateVehicleCommand> _validator;

    public UpdateVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        IValidator<UpdateVehicleCommand> validator) {
        _vehicleRepository = vehicleRepository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(UpdateVehicleCommand request, CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        if (!string.Equals(vehicle.PlateNumber, request.PlateNumber, StringComparison.OrdinalIgnoreCase)) {
            var plateExists = await _vehicleRepository.ExistsByPlateNumberAsync(
                request.PlateNumber, vehicle.CompanyId, request.Id, cancellationToken);
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
            isActive: request.IsActive);

        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }
}
