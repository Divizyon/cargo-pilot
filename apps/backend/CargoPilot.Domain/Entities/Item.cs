using CargoPilot.Domain.Enums;
using System.Text.Json;

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
    public FragilityType FragilityType { get; private set; }
    public string ConstraintIdsJson { get; private set; } = "[]";
    public bool IsStackable { get; private set; }
    public int MaxStackCount { get; private set; }
    public decimal MaxWeightOnTop { get; private set; }
    public AllowedRotations AllowedRotations { get; private set; }
    public string? StackGroup { get; private set; }
    public string IncompatibleGroupsJson { get; private set; } = "[]";
    public string? SpecialNotes { get; private set; }
    public Guid? CompanyId { get; private set; }
    public string? ErpId { get; private set; }
    public Guid? IntegrationId { get; private set; }
#pragma warning disable S1144
    public Company? Company { get; private set; }
    public Integration? Integration { get; private set; }
#pragma warning restore S1144

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
        FragilityType fragilityType,
        bool isStackable,
        int maxStackCount,
        decimal maxWeightOnTop,
        AllowedRotations allowedRotations,
        string? barcode = null,
        decimal? diameter = null,
        string? stackGroup = null,
        string[]? incompatibleGroups = null,
        string? specialNotes = null,
        int[]? constraintIds = null,
        Guid? companyId = null) : base(id) {
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
        ConstraintIdsJson = SerializeConstraintIds(constraintIds);
        IsStackable = isStackable;
        MaxStackCount = maxStackCount;
        MaxWeightOnTop = maxWeightOnTop;
        AllowedRotations = allowedRotations;
        StackGroup = stackGroup;
        IncompatibleGroupsJson = SerializeStringArray(incompatibleGroups);
        SpecialNotes = specialNotes;
        CompanyId = companyId;
    }

    public void SetErpSource(string erpId, Guid integrationId) {
        ErpId = erpId;
        IntegrationId = integrationId;
    }

    public void ClearErpSource() {
        ErpId = null;
        IntegrationId = null;
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
        string? stackGroup,
        string[]? incompatibleGroups,
        string? specialNotes,
        int[]? constraintIds = null) {
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
        ConstraintIdsJson = SerializeConstraintIds(constraintIds);
        IsStackable = isStackable;
        MaxStackCount = maxStackCount;
        MaxWeightOnTop = maxWeightOnTop;
        AllowedRotations = allowedRotations;
        StackGroup = stackGroup;
        IncompatibleGroupsJson = SerializeStringArray(incompatibleGroups);
        SpecialNotes = specialNotes;
    }

    public int[] GetConstraintIds() {
        if (string.IsNullOrEmpty(ConstraintIdsJson) || ConstraintIdsJson == "[]")
            return [];
        try {
            return JsonSerializer.Deserialize<int[]>(ConstraintIdsJson) ?? [];
        }
        catch {
            return [];
        }
    }

    public string[] GetIncompatibleGroups() {
        if (string.IsNullOrEmpty(IncompatibleGroupsJson) || IncompatibleGroupsJson == "[]")
            return [];
        try {
            return JsonSerializer.Deserialize<string[]>(IncompatibleGroupsJson) ?? [];
        }
        catch {
            return [];
        }
    }

    private static string SerializeConstraintIds(int[]? constraintIds) {
        if (constraintIds is null or { Length: 0 })
            return "[]";
        return JsonSerializer.Serialize(constraintIds);
    }

    private static string SerializeStringArray(string[]? values) {
        if (values is null or { Length: 0 })
            return "[]";
        return JsonSerializer.Serialize(values);
    }
}
