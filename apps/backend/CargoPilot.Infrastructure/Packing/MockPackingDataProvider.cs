using CargoPilot.Application.Features.Packing.OptimizePacking;
using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

public sealed class MockPackingDataProvider : IPackingMockDataProvider {
    // 20-ft ISO konteyner (iç ölçüler — metre)
    public ContainerSpec GetContainer() => new(
        Length: 5.90m,
        Width: 2.35m,
        Height: 2.39m,
        MaxWeight: 21770m);

    public PackingParameters GetParameters(bool lifoEnabled, decimal cgThreshold)
        => new(lifoEnabled, cgThreshold);

    public IReadOnlyList<ItemSpec> GetItems() {
        var items = new List<ItemSpec>();

        // Büyük Kutu — 120×80×100 cm, 10 kg, 15 adet
        for (int i = 1; i <= 5; i++)
            items.Add(new(
                Id: $"BK-{i:D2}",
                Name: $"Büyük Kutu {i}",
                Length: 1.20m,
                Width: 0.80m,
                Height: 1.00m,
                Weight: 10m,
                IsStackable: true,
                MaxWeightOnTop: 1000m,
                LifoIndex: null));

        // Küp Kutu — 80×80×80 cm, 10 kg, 18 adet
        for (int i = 1; i <= 40; i++)
            items.Add(new(
                Id: $"KK-{i:D2}",
                Name: $"Küp Kutu {i}",
                Length: 0.80m,
                Width: 0.80m,
                Height: 0.80m,
                Weight: 10m,
                IsStackable: true,
                MaxWeightOnTop: 1000m,
                LifoIndex: null));

        // Ara Doldurucu — 40×30×20 cm, 10 kg, 50 adet
        for (int i = 1; i <= 50; i++)
            items.Add(new(
                Id: $"AD-{i:D2}",
                Name: $"Ara Doldurucu {i}",
                Length: 0.40m,
                Width: 0.30m,
                Height: 0.20m,
                Weight: 10m,
                IsStackable: true,
                MaxWeightOnTop: 1000m,
                LifoIndex: null));

        return items;
    }
}
