namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlanWarning : BaseEntity {
#pragma warning disable S1144
    public Guid LoadingPlanId { get; private set; }
    public string Code { get; private set; } = null!;
    public string Message { get; private set; } = null!;
    public Guid? RelatedItemId { get; private set; }
    public Guid? RelatedPlacementId { get; private set; }
#pragma warning restore S1144

#pragma warning disable S1144
    public LoadingPlan LoadingPlan { get; private set; } = null!;
    public Item? RelatedItem { get; private set; }
    public LoadingPlanPlacement? RelatedPlacement { get; private set; }
#pragma warning restore S1144

    private LoadingPlanWarning() { }

    public LoadingPlanWarning(
        Guid id,
        Guid loadingPlanId,
        string code,
        string message,
        Guid? relatedItemId = null,
        Guid? relatedPlacementId = null) : base(id) {
        LoadingPlanId = loadingPlanId;
        Code = code;
        Message = message;
        RelatedItemId = relatedItemId;
        RelatedPlacementId = relatedPlacementId;
    }
}
