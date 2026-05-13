using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Infrastructure.Services;

internal sealed class ErpExportService : IErpExportService {
    public Task ExportAsync(LoadingPlan plan, Integration integration, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
