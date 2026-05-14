using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IErpExportService {
    Task ExportAsync(LoadingPlan plan, Integration integration, CancellationToken cancellationToken = default);
}
