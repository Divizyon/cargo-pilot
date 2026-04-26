using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Item : BaseEntity {
    public string SKU { get; private set; } = null!;
    public string? Barcode { get; private set; }
    public string Name { get; private set; } = null!;
    public string ProductType { get; private set; } = null!;
    public ItemCategory Category { get; private set; }

    // Original (user-entered) values + units
    public decimal WidthOriginalValue { get; private set; }
    public LengthUnit WidthUnit { get; private set; }
    public decimal HeightOriginalValue { get; private set; }
    public LengthUnit HeightUnit { get; private set; }
    public decimal LengthOriginalValue { get; private set; }
    public LengthUnit LengthUnit { get; private set; }
    public decimal WeightOriginalValue { get; private set; }
    public WeightUnit WeightUnit { get; private set; }

    // Normalized values (base units) for algorithms
    public decimal WidthInCm { get; private set; }
    public decimal HeightInCm { get; private set; }
    public decimal LengthInCm { get; private set; }
    public decimal WeightInKg { get; private set; }
    public decimal VolumeInCm3 { get; private set; }
    public decimal Width { get; private set; }
    public decimal Height { get; private set; }
    public decimal Length { get; private set; }
    public decimal? Diameter { get; private set; }
    public decimal Weight { get; private set; }
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
        decimal widthOriginalValue,
        LengthUnit widthUnit,
        decimal heightOriginalValue,
        LengthUnit heightUnit,
        decimal lengthOriginalValue,
        LengthUnit lengthUnit,
        decimal weightOriginalValue,
        WeightUnit weightUnit,
        decimal widthInCm,
        decimal heightInCm,
        decimal lengthInCm,
        decimal weightInKg,
        decimal volumeInCm3,
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
        WidthOriginalValue = widthOriginalValue;
        WidthUnit = widthUnit;
        HeightOriginalValue = heightOriginalValue;
        HeightUnit = heightUnit;
        LengthOriginalValue = lengthOriginalValue;
        LengthUnit = lengthUnit;
        WeightOriginalValue = weightOriginalValue;
        WeightUnit = weightUnit;

        WidthInCm = widthInCm;
        HeightInCm = heightInCm;
        LengthInCm = lengthInCm;
        WeightInKg = weightInKg;
        VolumeInCm3 = volumeInCm3;

        // Back-compat columns: keep normalized values mirrored
        Width = widthInCm;
        Height = heightInCm;
        Length = lengthInCm;
        Diameter = diameter;
        Weight = weightInKg;
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
        decimal widthOriginalValue,
        LengthUnit widthUnit,
        decimal heightOriginalValue,
        LengthUnit heightUnit,
        decimal lengthOriginalValue,
        LengthUnit lengthUnit,
        decimal weightOriginalValue,
        WeightUnit weightUnit,
        decimal widthInCm,
        decimal heightInCm,
        decimal lengthInCm,
        decimal weightInKg,
        decimal volumeInCm3,
        decimal? diameter,
        FragilityType fragilityType,
        bool isStackable,
        int maxStackCount,
        decimal maxWeightOnTop,
        AllowedRotations allowedRotations,
        string? imageUrl,
        string? stackGroup,
        string? specialNotes)
    {
        SKU = sku;
        Barcode = barcode;
        Name = name;
        ProductType = productType;
        Category = category;

        WidthOriginalValue = widthOriginalValue;
        WidthUnit = widthUnit;
        HeightOriginalValue = heightOriginalValue;
        HeightUnit = heightUnit;
        LengthOriginalValue = lengthOriginalValue;
        LengthUnit = lengthUnit;
        WeightOriginalValue = weightOriginalValue;
        WeightUnit = weightUnit;

        WidthInCm = widthInCm;
        HeightInCm = heightInCm;
        LengthInCm = lengthInCm;
        WeightInKg = weightInKg;
        VolumeInCm3 = volumeInCm3;

        Width = widthInCm;
        Height = heightInCm;
        Length = lengthInCm;
        Weight = weightInKg;
        Diameter = diameter;

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
