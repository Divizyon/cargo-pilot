namespace CargoPilot.Application.Features.Plans.GetDashboardStats;

public sealed record DashboardStatsDto(
    decimal VehicleEfficiency,
    decimal TotalLoadedTonnage,
    int TotalLoadingCount);
