using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlanPlacement : BaseEntity {
#pragma warning disable S1144
    public Guid LoadingPlanId { get; private set; }
    public Guid ItemId { get; private set; }
    public decimal PositionX { get; private set; }
    public decimal PositionY { get; private set; }
    public decimal PositionZ { get; private set; }
    public LoadingPlanPlacementRotation Rotation { get; private set; }
#pragma warning restore S1144

    public LoadingPlan LoadingPlan { get; private set; } = null!;
    public Item Item { get; private set; } = null!;

    private LoadingPlanPlacement() { }

    public int StepIndex { get; private set; }

    public LoadingPlanPlacement(
        Guid id,
        Guid loadingPlanId,
        Guid itemId,
        decimal positionX,
        decimal positionY,
        decimal positionZ,
        LoadingPlanPlacementRotation rotation,
        int stepIndex = 0) : base(id) {
        LoadingPlanId = loadingPlanId;
        ItemId = itemId;
        PositionX = positionX;
        PositionY = positionY;
        PositionZ = positionZ;
        Rotation = rotation;
        StepIndex = stepIndex;
    }
}
