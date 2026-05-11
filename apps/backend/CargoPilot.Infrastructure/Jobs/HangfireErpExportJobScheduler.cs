using CargoPilot.Application.Common.Interfaces;
using Hangfire;

namespace CargoPilot.Infrastructure.Jobs;

internal sealed class HangfireErpExportJobScheduler : IErpExportJobScheduler {
    private readonly IBackgroundJobClient _client;

    public HangfireErpExportJobScheduler(IBackgroundJobClient client) {
        _client = client;
    }

    public void Enqueue(Guid loadingPlanId, Guid companyId)
        => _client.Enqueue<ErpExportJob>(j => j.ExecuteAsync(loadingPlanId, companyId, CancellationToken.None));
}
