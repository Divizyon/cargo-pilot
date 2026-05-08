using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.DeleteVehicle;

public sealed class DeleteVehicleCommandHandler : IRequestHandler<DeleteVehicleCommand, Result<Guid>>
{
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;

    public DeleteVehicleCommandHandler(
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService)
    {
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(DeleteVehicleCommand request, CancellationToken cancellationToken)
    {
        var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, _currentUserService.CompanyId, cancellationToken);
        if (vehicle is null)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));
        }

        var isUsedInActivePlan = await _vehicleRepository.IsUsedInActiveLoadingPlanAsync(request.Id, cancellationToken);
        if (isUsedInActivePlan)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Vehicle.UsedInActiveLoadingPlan",
                    "Bu araç aktif bir yükleme planında kullanıldığı için arşivlenemez."));
        }

        vehicle.MarkAsDeleted();
        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }
}
