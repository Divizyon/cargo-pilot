using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Jobs;

internal sealed class NoOpErpExportJobScheduler : IErpExportJobScheduler {
    public void Enqueue(Guid loadingPlanId, Guid companyId) { }
}
