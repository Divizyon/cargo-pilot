using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.DuplicateVehicle;

public sealed class DuplicateVehicleCommandHandler : IRequestHandler<DuplicateVehicleCommand, Result<Guid>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<DuplicateVehicleCommand> _validator;

    public DuplicateVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService,
        IValidator<DuplicateVehicleCommand> validator) {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(DuplicateVehicleCommand request, CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        var source = await _vehicleRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (source is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        var plateExists = await _vehicleRepository.ExistsByPlateNumberAsync(
            request.PlateNumber, companyId, cancellationToken);
        if (plateExists)
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Vehicle.PlateNumberAlreadyExists", "Bu plaka zaten kullanımda."));

        var duplicate = new Vehicle(
            id: Guid.NewGuid(),
            vehicleName: request.VehicleName,
            vehicleType: source.VehicleType,
            plateNumber: request.PlateNumber,
            internalWidth: source.InternalWidth,
            internalHeight: source.InternalHeight,
            internalLength: source.InternalLength,
            maxWeightCapacity: source.MaxWeightCapacity,
            kingPinDistanceMm: source.KingPinDistanceMm,
            kingPinTareWeightKg: source.KingPinTareWeightKg,
            kingPinMaxLoadKg: source.KingPinMaxLoadKg,
            mainAxleDistanceMm: source.MainAxleDistanceMm,
            mainAxleTareWeightKg: source.MainAxleTareWeightKg,
            mainAxleMaxLoadKg: source.MainAxleMaxLoadKg,
            additionalAxleDistanceMm: source.AdditionalAxleDistanceMm,
            additionalAxleTareWeightKg: source.AdditionalAxleTareWeightKg,
            additionalAxleMaxLoadKg: source.AdditionalAxleMaxLoadKg,
            layerCount: source.LayerCount,
            loadingType: source.LoadingType,
            companyId: companyId);

        _vehicleRepository.Add(duplicate);
        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(duplicate.Id);
    }
}
