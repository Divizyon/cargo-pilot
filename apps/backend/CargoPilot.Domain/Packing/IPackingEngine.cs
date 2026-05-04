namespace CargoPilot.Domain.Packing;

public interface IPackingEngine
{
    PackingResult Optimize(
        ContainerSpec container,
        IReadOnlyList<ItemSpec> items,
        PackingParameters parameters);
}
