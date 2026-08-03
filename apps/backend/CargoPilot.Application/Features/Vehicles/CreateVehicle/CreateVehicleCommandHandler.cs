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
    private readonly INotificationService _notificationService;
    private readonly IValidator<CreateVehicleCommand> _validator;

    public CreateVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        IValidator<CreateVehicleCommand> validator) {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
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
            {
                await _notificationService.CreateAsync(
                    userId: userId,
                    companyId: companyId,
                    type: NotificationType.UsageLimitReached,
                    title: "Araç Kotası Doldu",
                    description: $"Maksimum araç sayısına ({maxCount}) ulaştınız. Daha fazla araç eklemek için planınızı yükseltin.",
                    cancellationToken: cancellationToken);
                return Result<Guid>.Failure(
                    new Error(ErrorType.BusinessRule, "Vehicle.LimitExceeded",
                        "Abonelik planı kapsamındaki maksimum araç sayısına ulaşıldı."));
            }

            var warningThreshold = (int)(maxCount * 0.8);
            if (currentCount + 1 >= warningThreshold && currentCount + 1 < maxCount)
            {
                await _notificationService.CreateAsync(
                    userId: userId,
                    companyId: companyId,
                    type: NotificationType.UsageLimitWarning,
                    title: "Araç Kotası Dolmak Üzere",
                    description: $"Araç kotanızın %80'ine ulaştınız ({currentCount + 1}/{maxCount}). Kota dolmadan önce planınızı yükseltmeyi düşünün.",
                    cancellationToken: cancellationToken);
            }
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
