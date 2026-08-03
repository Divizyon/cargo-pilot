using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.AddVehicleFavorite;

public sealed class AddVehicleFavoriteCommandHandler : IRequestHandler<AddVehicleFavoriteCommand, Result<bool>> {
    private readonly IUserVehicleFavoriteRepository _favoriteRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<AddVehicleFavoriteCommand> _validator;

    public AddVehicleFavoriteCommandHandler(
        IUserVehicleFavoriteRepository favoriteRepository,
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService,
        IValidator<AddVehicleFavoriteCommand> validator) {
        _favoriteRepository = favoriteRepository;
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<bool>> Handle(AddVehicleFavoriteCommand request, CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<bool>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        if (_currentUserService.UserId is not { } userId)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, _currentUserService.CompanyId, cancellationToken);
        if (vehicle is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "VEHICLE_NOT_FOUND", "Araç bulunamadı."));

        var existing = await _favoriteRepository.GetByUserAndVehicleAsync(userId, request.VehicleId, cancellationToken);
        if (existing is not null)
            return Result<bool>.Failure(
                new Error(ErrorType.Conflict, "VEHICLE_ALREADY_FAVORITE", "Bu araç zaten favorilerde."));

        var favorite = new UserVehicleFavorite(Guid.NewGuid(), userId, request.VehicleId);
        _favoriteRepository.Add(favorite);
        await _favoriteRepository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
