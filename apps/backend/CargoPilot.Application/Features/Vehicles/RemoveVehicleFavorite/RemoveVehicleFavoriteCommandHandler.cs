using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.RemoveVehicleFavorite;

public sealed class RemoveVehicleFavoriteCommandHandler : IRequestHandler<RemoveVehicleFavoriteCommand, Result<bool>> {
    private readonly IUserVehicleFavoriteRepository _favoriteRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<RemoveVehicleFavoriteCommand> _validator;

    public RemoveVehicleFavoriteCommandHandler(
        IUserVehicleFavoriteRepository favoriteRepository,
        ICurrentUserService currentUserService,
        IValidator<RemoveVehicleFavoriteCommand> validator) {
        _favoriteRepository = favoriteRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<bool>> Handle(RemoveVehicleFavoriteCommand request, CancellationToken cancellationToken) {
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

        var favorite = await _favoriteRepository.GetByUserAndVehicleAsync(userId, request.VehicleId, cancellationToken);
        if (favorite is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "VEHICLE_FAVORITE_NOT_FOUND", "Bu araç favorilerde bulunamadı."));

        favorite.MarkAsDeleted();
        await _favoriteRepository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
