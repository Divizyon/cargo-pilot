using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.DeletePendingVehicleMapping;

internal sealed class DeletePendingVehicleMappingCommandHandler
    : IRequestHandler<DeletePendingVehicleMappingCommand, Result<Guid>>
{
    private readonly IPendingVehicleMappingRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public DeletePendingVehicleMappingCommandHandler(
        IPendingVehicleMappingRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(
        DeletePendingVehicleMappingCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var mapping = await _repository.GetByIdAsync(
            request.MappingId,
            companyId,
            cancellationToken);

        if (mapping is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "PendingVehicleMapping.NotFound", "Bekleyen mapping bulunamadı."));

        if (mapping.IntegrationId != request.IntegrationId)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "PendingVehicleMapping.NotFound", "Bekleyen mapping bulunamadı."));

        _repository.Remove(mapping);
        await _repository.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(mapping.Id);
    }
}