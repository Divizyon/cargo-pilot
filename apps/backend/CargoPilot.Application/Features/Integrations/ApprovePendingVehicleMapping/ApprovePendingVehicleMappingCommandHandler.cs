using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.ApprovePendingVehicleMapping;

internal sealed class ApprovePendingVehicleMappingCommandHandler
    : IRequestHandler<ApprovePendingVehicleMappingCommand, Result<Guid>>
{
    private readonly IPendingVehicleMappingRepository _pendingRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;

    public ApprovePendingVehicleMappingCommandHandler(
        IPendingVehicleMappingRepository pendingRepository,
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService)
    {
        _pendingRepository = pendingRepository;
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(
        ApprovePendingVehicleMappingCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var mapping = await _pendingRepository.GetByIdAsync(
            request.MappingId,
            companyId,
            cancellationToken);

        if (mapping is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "PendingVehicleMapping.NotFound", "Bekleyen mapping bulunamadı."));

        if (mapping.IntegrationId != request.IntegrationId)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "PendingVehicleMapping.NotFound", "Bekleyen mapping bulunamadı."));

        var vehicle = new Vehicle(
            Guid.NewGuid(),
            mapping.VehicleName,
            Domain.Enums.VehicleType.Truck,
            mapping.PlateNumber,
            0,
            0,
            0,
            0,
            1,
            Domain.Enums.LoadingType.Rear,
            companyId);

        vehicle.SetErpSource(mapping.ErpId, mapping.IntegrationId);
        _vehicleRepository.Add(vehicle);

        _pendingRepository.Remove(mapping);
        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }
}