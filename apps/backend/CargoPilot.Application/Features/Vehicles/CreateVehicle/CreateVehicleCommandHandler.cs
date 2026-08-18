using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.CreateVehicle;

public sealed class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Result<Guid>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ICompanyRepository _companyRepository;

    public CreateVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        ICompanyRepository companyRepository) {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _companyRepository = companyRepository;
    }

    public async Task<Result<Guid>> Handle(CreateVehicleCommand request, CancellationToken cancellationToken) {
        if (_currentUserService.UserId is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var companyId = _currentUserService.CompanyId;

        var quotaError = await EnforceVehicleQuotaAsync(companyId, cancellationToken);
        if (quotaError is not null)
            return Result<Guid>.Failure(quotaError);

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

        // Istemci kapi listesi gonderdiyse o gecerlidir; gondermediyse liste
        // tekil LoadingType'dan turetilir (eski istemciler icin gecis yolu).
        if (request.Doors is { Count: > 0 })
            vehicle.ReplaceDoors(request.Doors.Select(door => (door.Type, door.Face)));
        else
            DoorSetFactory.EnsureDoors(vehicle);

        // Tekil alan kapi listesinden turetilir; iki kaynak ayrismasin.
        vehicle.SyncLoadingTypeFromDoors();

        _vehicleRepository.Add(vehicle);
        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }

    /// <summary>
    /// Araç kotasını kullanıcının gerçek abonelik tipine göre uygular.
    /// Kota aşıldıysa hata döner, aşılmadıysa null döner.
    /// </summary>
    private async Task<Error?> EnforceVehicleQuotaAsync(Guid? companyId, CancellationToken cancellationToken) {
        var userType = _currentUserService.UserType;
        if (!IsQuotaEnforced(userType) || _currentUserService.UserId is not { } userId)
            return null;

        var subscriptionType = await ResolveSubscriptionTypeAsync(companyId, cancellationToken);
        var maxCount = SubscriptionLimits.GetMaxVehicleCount(subscriptionType);

        // Bireysel kullanıcının kotası kendi araçlarıyla, kurumsal kullanıcınınki
        // şirketin tüm araçlarıyla ölçülür (GetMySubscription ile aynı).
        var currentCount = userType == UserType.Individual || companyId is not { } quotaCompanyId
            ? await _vehicleRepository.CountByUserAsync(userId, cancellationToken)
            : await _vehicleRepository.CountByCompanyAsync(quotaCompanyId, cancellationToken);

        if (currentCount >= maxCount) {
            await _notificationService.CreateAsync(
                userId: userId,
                companyId: companyId,
                type: NotificationType.UsageLimitReached,
                title: "Araç Kotası Doldu",
                description: $"Maksimum araç sayısına ({maxCount}) ulaştınız. Daha fazla araç eklemek için planınızı yükseltin.",
                cancellationToken: cancellationToken);
            return new Error(ErrorType.BusinessRule, "Vehicle.LimitExceeded",
                "Abonelik planı kapsamındaki maksimum araç sayısına ulaşıldı.");
        }

        var warningThreshold = (int)(maxCount * 0.8);
        if (currentCount + 1 >= warningThreshold && currentCount + 1 < maxCount) {
            await _notificationService.CreateAsync(
                userId: userId,
                companyId: companyId,
                type: NotificationType.UsageLimitWarning,
                title: "Araç Kotası Dolmak Üzere",
                description: $"Araç kotanızın %80'ine ulaştınız ({currentCount + 1}/{maxCount}). Kota dolmadan önce planınızı yükseltmeyi düşünün.",
                cancellationToken: cancellationToken);
        }

        return null;
    }

    /// <summary>SuperAdmin platform rolüdür; müşteri kotasına tabi değildir.</summary>
    private static bool IsQuotaEnforced(UserType? userType) =>
        userType is UserType.Individual or UserType.CompanyAdmin or UserType.CompanyWorker;

    /// <summary>Abonelik tipi şirket kaydında tutulur; kayıt yoksa güvenli varsayılan Free'dir.</summary>
    private async Task<SubscriptionType> ResolveSubscriptionTypeAsync(Guid? companyId, CancellationToken cancellationToken) {
        if (companyId is not { } id)
            return SubscriptionType.Free;

        var company = await _companyRepository.GetByIdAsync(id, cancellationToken);
        return company?.SubscriptionType ?? SubscriptionType.Free;
    }
}
