using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlan : BaseEntity {
#pragma warning disable S1144
    public string PlanName { get; private set; } = null!;
    public LoadingPlanOptimizationCriteria OptimizationCriteria { get; private set; }
    public LoadingPlanOptimizationStatus OptimizationStatus { get; private set; }
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }
    public decimal TotalWeight { get; private set; }
    public decimal FillRate { get; private set; }
    public int InputTotalQuantity { get; private set; }
    public int PlacedQuantity { get; private set; }
    public int UnplacedQuantity { get; private set; }
    public decimal? CenterOfGravityX { get; private set; }
    public decimal? CenterOfGravityY { get; private set; }
    public decimal? CenterOfGravityZ { get; private set; }
    public Guid? CompanyId { get; private set; }
    public Guid? ReportId { get; private set; }
    public string? ReportUrl { get; private set; }
    public string? ThumbnailUrl { get; private set; }
    public ErpExportStatus? ErpExportStatus { get; private set; }
#pragma warning restore S1144

    public List<LoadingPlanVehicle> Vehicles { get; private set; } = [];
#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144

    private LoadingPlan() { }

    public void UpdatePlanName(string planName) => PlanName = planName;

    public void Reoptimize(LoadingPlanOptimizationCriteria optimizationCriteria, int inputTotalQuantity) {
        OptimizationCriteria = optimizationCriteria;
        InputTotalQuantity = inputTotalQuantity;
    }
    public void MarkErpPending() => ErpExportStatus = Enums.ErpExportStatus.Pending;
    public void MarkErpSent()    => ErpExportStatus = Enums.ErpExportStatus.Sent;
    public void MarkErpFailed()  => ErpExportStatus = Enums.ErpExportStatus.Failed;
    public void SetThumbnailUrl(string url) => ThumbnailUrl = url;

    public void ApplyOptimizationResult(
        LoadingPlanOptimizationStatus status,
        decimal totalWeight,
        decimal fillRate,
        int placedQuantity,
        int unplacedQuantity,
        decimal? centerOfGravityX,
        decimal? centerOfGravityY,
        decimal? centerOfGravityZ,
        string? errorCode = null,
        string? errorMessage = null)
    {
        OptimizationStatus = status;
        TotalWeight = totalWeight;
        FillRate = fillRate;
        PlacedQuantity = placedQuantity;
        UnplacedQuantity = unplacedQuantity;
        CenterOfGravityX = centerOfGravityX;
        CenterOfGravityY = centerOfGravityY;
        CenterOfGravityZ = centerOfGravityZ;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }

    public LoadingPlan(
        Guid id,
        string planName,
        LoadingPlanOptimizationCriteria optimizationCriteria,
        int inputTotalQuantity,
        Guid? companyId = null) : base(id) {
        PlanName = planName;
        OptimizationCriteria = optimizationCriteria;
        OptimizationStatus = LoadingPlanOptimizationStatus.Draft;
        TotalWeight = 0m;
        FillRate = 0m;
        InputTotalQuantity = inputTotalQuantity;
        PlacedQuantity = 0;
        UnplacedQuantity = 0;
        CompanyId = companyId;
    }
}
