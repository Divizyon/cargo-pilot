using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.CreateVehicle;

public sealed class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Result<Guid>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreateVehicleCommand> _validator;

    public CreateVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService,
        IValidator<CreateVehicleCommand> validator) {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(CreateVehicleCommand request, CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        if (_currentUserService.UserId is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var companyId = _currentUserService.CompanyId;

        if (_currentUserService.UserType == UserType.Individual && _currentUserService.UserId is { } userId)
        {
            var currentCount = await _vehicleRepository.CountByUserAsync(userId, cancellationToken);
            var maxCount = SubscriptionLimits.GetMaxVehicleCount(SubscriptionType.Free);
            if (currentCount >= maxCount)
                return Result<Guid>.Failure(
                    new Error(ErrorType.BusinessRule, "Vehicle.LimitExceeded",
                        "Abonelik planı kapsamındaki maksimum araç sayısına ulaşıldı."));
        }

        if (request.PlateNumber is not null) {
            var plateExists = await _vehicleRepository.ExistsByPlateNumberAsync(
                request.PlateNumber, companyId, cancellationToken);
            if (plateExists)
                return Result<Guid>.Failure(
                    new Error(ErrorType.Conflict, "Vehicle.PlateNumberAlreadyExists", "Bu plaka zaten kullanımda."));
        }

        var vehicle = new Vehicle(
            id: Guid.NewGuid(),
            vehicleName: request.VehicleName,
            vehicleType: request.VehicleType,
            description: request.Description,
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
            companyId: companyId,
            isDraft: request.IsDraft);

        _vehicleRepository.Add(vehicle);
        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }
}
