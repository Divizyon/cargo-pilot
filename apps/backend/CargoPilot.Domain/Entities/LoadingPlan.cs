using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlan : BaseEntity {
#pragma warning disable S1144
    public string PlanName { get; private set; } = null!;
    public Guid VehicleId { get; private set; }
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

    // ── Kosu kimligi ─────────────────────────────────────────────────────────
    // Determinizm sozlesmesi (ALGORITMA-RULEBOOK.md R-C02) "ayni tohum + ayni
    // girdi bit birebir ayni plani uretir" der. Bu soz, planin HANGI sequencer
    // ve HANGI tohumla uretildigi kayitli degilse kullanilamaz: bir plani yeniden
    // uretmek isteyen kisinin elinde yalnizca sonuc kalirdi.
    //
    // Yerlestirici alani kaldirildi (`DR-39`): tek yerlestirici kaldigi icin
    // kaydetmenin bilgi degeri yok.
    public SequencerKind Sequencer { get; private set; }
    public int Seed { get; private set; }

    // Arama katmani kostuysa kosu istatistigi; statik yolda null.
    public int? SearchIterations { get; private set; }
    public int? SearchEvaluations { get; private set; }
    public bool? SearchImproved { get; private set; }
    public long? SearchDurationMs { get; private set; }
#pragma warning restore S1144

    public Vehicle Vehicle { get; private set; } = null!;
#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144

    private LoadingPlan() { }

    public void UpdatePlanName(string planName) => PlanName = planName;

    public void Reoptimize(Guid vehicleId, LoadingPlanOptimizationCriteria optimizationCriteria, int inputTotalQuantity) {
        VehicleId = vehicleId;
        OptimizationCriteria = optimizationCriteria;
        InputTotalQuantity = inputTotalQuantity;
    }
    public void MarkErpPending() => ErpExportStatus = Enums.ErpExportStatus.Pending;
    public void MarkErpSent()    => ErpExportStatus = Enums.ErpExportStatus.Sent;
    public void MarkErpFailed()  => ErpExportStatus = Enums.ErpExportStatus.Failed;
    public void SetThumbnailUrl(string url) => ThumbnailUrl = url;

    /// <summary>
    /// Plani ureten kosunun kimligi. Sonuc metriklerinden ayri durur cunku bunlar
    /// "ne cikti" degil "nasil uretildi" sorusunun cevabidir; yeniden optimize
    /// edildiginde de yeni kosunun degerleriyle degisir.
    /// </summary>
    public void RecordOptimizationRun(
        SequencerKind sequencer,
        int seed,
        int? searchIterations = null,
        int? searchEvaluations = null,
        bool? searchImproved = null,
        long? searchDurationMs = null)
    {
        Sequencer = sequencer;
        Seed = seed;
        SearchIterations = searchIterations;
        SearchEvaluations = searchEvaluations;
        SearchImproved = searchImproved;
        SearchDurationMs = searchDurationMs;
    }

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
        Guid vehicleId,
        LoadingPlanOptimizationCriteria optimizationCriteria,
        int inputTotalQuantity,
        Guid? companyId = null) : base(id) {
        PlanName = planName;
        VehicleId = vehicleId;
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
