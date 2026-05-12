namespace CargoPilot.Application.Common.Interfaces;

public interface IErpExportJobScheduler {
    void Enqueue(Guid loadingPlanId, Guid companyId);
}
