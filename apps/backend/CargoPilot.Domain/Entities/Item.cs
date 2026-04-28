using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Item : BaseEntity {
    public string SKU { get; private set; } = null!;
    public string? Barcode { get; private set; }
    public string Name { get; private set; } = null!;
    public string ProductType { get; private set; } = null!;
    public ItemCategory Category { get; private set; }
    public decimal Width { get; private set; }
    public decimal Height { get; private set; }
    public decimal Length { get; private set; }
    public decimal? Diameter { get; private set; }
    public decimal Weight { get; private set; }
    public DimensionUnit DimensionUnit { get; private set; }
    public WeightUnit WeightUnit { get; private set; }
    public StockStatus StockStatus { get; private set; }
    public FragilityType FragilityType { get; private set; }
    public bool IsStackable { get; private set; }
    public int MaxStackCount { get; private set; }
    public decimal MaxWeightOnTop { get; private set; }
    public AllowedRotations AllowedRotations { get; private set; }
    public string? ImageUrl { get; private set; }
    public string? StackGroup { get; private set; }
    public string? SpecialNotes { get; private set; }

    private Item() { }

    public Item(
        Guid id,
        string sku,
        string name,
        string productType,
        ItemCategory category,
        decimal width,
        decimal height,
        decimal length,
        decimal weight,
        DimensionUnit dimensionUnit,
        WeightUnit weightUnit,
        StockStatus stockStatus,
        FragilityType fragilityType,
        bool isStackable,
        int maxStackCount,
        decimal maxWeightOnTop,
        AllowedRotations allowedRotations,
        string? barcode = null,
        decimal? diameter = null,
        string? imageUrl = null,
        string? stackGroup = null,
        string? specialNotes = null) : base(id) {
        SKU = sku;
        Barcode = barcode;
        Name = name;
        ProductType = productType;
        Category = category;
        Width = width;
        Height = height;
        Length = length;
        Diameter = diameter;
        Weight = weight;
        DimensionUnit = dimensionUnit;
        WeightUnit = weightUnit;
        StockStatus = stockStatus;
        FragilityType = fragilityType;
        IsStackable = isStackable;
        MaxStackCount = maxStackCount;
        MaxWeightOnTop = maxWeightOnTop;
        AllowedRotations = allowedRotations;
        ImageUrl = imageUrl;
        StackGroup = stackGroup;
        SpecialNotes = specialNotes;
    }

    public void Update(
        string sku,
        string? barcode,
        string name,
        string productType,
        ItemCategory category,
        decimal width,
        decimal height,
        decimal length,
        decimal? diameter,
        decimal weight,
        FragilityType fragilityType,
        bool isStackable,
        int maxStackCount,
        decimal maxWeightOnTop,
        AllowedRotations allowedRotations,
        string? imageUrl,
        string? stackGroup,
        string? specialNotes) {
        SKU = sku;
        Barcode = barcode;
        Name = name;
        ProductType = productType;
        Category = category;
        Width = width;
        Height = height;
        Length = length;
        Diameter = diameter;
        Weight = weight;
        FragilityType = fragilityType;
        IsStackable = isStackable;
        MaxStackCount = maxStackCount;
        MaxWeightOnTop = maxWeightOnTop;
        AllowedRotations = allowedRotations;
        ImageUrl = imageUrl;
        StackGroup = stackGroup;
        SpecialNotes = specialNotes;
    }
}
