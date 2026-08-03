using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetLoadingPlanReports;

public sealed record LoadingPlanReportDto(
    Guid Id,
    string PlanName,
    DateTime CreatedAtUtc,
    string? VehiclePlate,
    decimal FillRate,
    LoadingPlanOptimizationStatus Status,
    Guid? ReportId,
    string? DownloadUrl);
