namespace CargoPilot.Application.Features.Plans.ApprovePlan;

/// <param name="PlanId">Onaylanan planin ID'si.</param>
/// <param name="ErpExportQueued">
/// ERP aktarimi is kuyruguna alindi mi. Ozellik anahtari kapaliyken false doner;
/// arayuz "aktarim kuyrukta" bilgisini yalnizca true iken gostermelidir.
/// </param>
public sealed record ApprovePlanResult(Guid PlanId, bool ErpExportQueued);
