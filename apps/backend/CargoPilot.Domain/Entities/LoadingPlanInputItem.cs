namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlanInputItem : BaseEntity
{
#pragma warning disable S1144
    public Guid LoadingPlanId { get; private set; }
    public Guid ItemId { get; private set; }
    public int Quantity { get; private set; }
    public Guid? GroupId { get; private set; }
#pragma warning restore S1144

    public LoadingPlan LoadingPlan { get; private set; } = null!;
    public Item Item { get; private set; } = null!;
#pragma warning disable S1144
    public LoadingPlanItemGroup? Group { get; private set; }
#pragma warning restore S1144

    private LoadingPlanInputItem() { }

    public LoadingPlanInputItem(Guid id, Guid loadingPlanId, Guid itemId, int quantity) : base(id)
    {
        LoadingPlanId = loadingPlanId;
        ItemId = itemId;
        Quantity = quantity;
    }

    public void AssignGroup(Guid? groupId) => GroupId = groupId;
}
