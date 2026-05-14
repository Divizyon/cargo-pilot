namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlanItemGroup : BaseEntity
{
#pragma warning disable S1144
    public Guid LoadingPlanId { get; private set; }
    public string Name { get; private set; } = null!;
    public string Color { get; private set; } = null!;
    public int UnloadingOrder { get; private set; }
#pragma warning restore S1144

    public LoadingPlan LoadingPlan { get; private set; } = null!;

    private LoadingPlanItemGroup() { }

    public LoadingPlanItemGroup(Guid id, Guid loadingPlanId, string name, string color, int unloadingOrder) : base(id)
    {
        LoadingPlanId = loadingPlanId;
        Name = name;
        Color = color;
        UnloadingOrder = unloadingOrder;
    }

    public void Update(string name, string color, int unloadingOrder)
    {
        Name = name;
        Color = color;
        UnloadingOrder = unloadingOrder;
    }
}
