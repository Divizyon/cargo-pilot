using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IVehicleRepository
{
    Task<PagedResult<Vehicle>> SearchAsync(
        string? searchTerm,
        int page,
        int pageSize,
        bool isExport,
        CancellationToken cancellationToken = default);
}
