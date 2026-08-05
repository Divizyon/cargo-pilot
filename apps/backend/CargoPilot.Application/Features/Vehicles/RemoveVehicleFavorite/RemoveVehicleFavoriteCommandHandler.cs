using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.RemoveVehicleFavorite;

public sealed class RemoveVehicleFavoriteCommandHandler : IRequestHandler<RemoveVehicleFavoriteCommand, Result<bool>> {
    private readonly IUserVehicleFavoriteRepository _favoriteRepository;
    private readonly ICurrentUserService _currentUserService;

    public RemoveVehicleFavoriteCommandHandler(
        IUserVehicleFavoriteRepository favoriteRepository,
        ICurrentUserService currentUserService) {
        _favoriteRepository = favoriteRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(RemoveVehicleFavoriteCommand request, CancellationToken cancellationToken) {
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
