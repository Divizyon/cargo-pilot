using CargoPilot.Domain.Packing;

namespace CargoPilot.Application.Features.Packing.OptimizePacking;

public interface IPackingMockDataProvider
{
    ContainerSpec GetContainer();
    IReadOnlyList<ItemSpec> GetItems();
    PackingParameters GetParameters(bool lifoEnabled, decimal cgThreshold);
}
