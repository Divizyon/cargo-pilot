using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IPendingVehicleMappingRepository
{
    Task<IReadOnlyList<PendingVehicleMapping>> GetByIntegrationIdAsync(Guid integrationId, Guid? companyId, CancellationToken cancellationToken = default);
    Task<PendingVehicleMapping?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);
    void Add(PendingVehicleMapping mapping);
    void Remove(PendingVehicleMapping mapping);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}