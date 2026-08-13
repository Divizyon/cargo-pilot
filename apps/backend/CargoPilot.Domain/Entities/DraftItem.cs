using CargoPilot.Domain.Enums;
using System.Text.Json;

namespace CargoPilot.Domain.Entities;

public sealed class DraftItem : BaseEntity
{
    public Guid CompanyId { get; private set; }
    public Guid IntegrationId { get; private set; }
    public string ErpId { get; private set; } = null!;
    public string ErpRawDataJson { get; private set; } = null!;
    public DraftItemStatus Status { get; private set; }

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

    /// <summary>Kullanicinin sectigi yuk gruplari; onayda Item'a birebir tasinir.</summary>
    public string IncompatibleGroupsJson { get; private set; } = "[]";
    public string? SpecialNotes { get; private set; }

    /// <summary>ERP kaynaginda eksik/sifir gelen alan adlarinin JSON listesi.</summary>
    public string MissingFieldsJson { get; private set; } = "[]";

#pragma warning disable S1144
    public Company? Company { get; private set; }
    public Integration? Integration { get; private set; }
#pragma warning restore S1144

    private DraftItem() { }

    public DraftItem(
        Guid id,
        Guid companyId,
        Guid integrationId,
        string erpId,
        string erpRawDataJson,
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
        IEnumerable<string>? missingFields = null,
        string? stackGroup = null,
        string[]? incompatibleGroups = null) : base(id)
    {
        CompanyId = companyId;
        IntegrationId = integrationId;
        ErpId = erpId;
        ErpRawDataJson = erpRawDataJson;
        Status = DraftItemStatus.Pending;
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
        StackGroup = stackGroup;
        IncompatibleGroupsJson = SerializeStringArray(incompatibleGroups);
        MissingFieldsJson = SerializeMissingFields(missingFields);
    }

    /// <summary>ERP tazelemesinde taslaga uygulanacak alanlar.</summary>
    public sealed record ErpRefresh(
        string Sku,
        string Name,
        string ErpRawDataJson,
        decimal Width,
        decimal Height,
        decimal Length,
        decimal Weight,
        string? Barcode,
        string? StackGroup,
        string[]? IncompatibleGroups,
        IEnumerable<string>? MissingFields);

    public void UpdateFromErp(ErpRefresh refresh) => ApplyErpRefresh(refresh);

    /// <summary>
    /// ERP'den yeni cekilen ham veri, taslakta duran son ERP anlik goruntusuyle ayni mi.
    /// Netsis satir bazli degisiklik damgasi tasimadigindan her sync tam tablo taramasidir;
    /// degisiklik yalnizca bu karsilastirmayla anlasilir. Kullanicinin taslak uzerinde
    /// yaptigi duzenlemeler <see cref="ErpRawDataJson"/>'a dokunmaz, bu yuzden karsilastirma
    /// "ERP degisti mi" sorusunu sorar, "taslak degisti mi" sorusunu degil.
    /// </summary>
    public bool MatchesErpSnapshot(string erpRawDataJson) =>
        string.Equals(ErpRawDataJson, erpRawDataJson, StringComparison.Ordinal);

    public void UpdateUserFields(
        string productType,
        ItemCategory category,
        decimal width,
        decimal height,
        decimal length,
        decimal weight,
        decimal? diameter,
        FragilityType fragilityType,
        bool isStackable,
        int maxStackCount,
        decimal maxWeightOnTop,
        AllowedRotations allowedRotations,
        string? barcode,
        string? stackGroup,
        string[]? incompatibleGroups,
        string? specialNotes,
        int[]? constraintIds = null)
    {
        ProductType = productType;
        Category = category;
        Width = width;
        Height = height;
        Length = length;
        Weight = weight;
        Diameter = diameter;
        FragilityType = fragilityType;
        IsStackable = isStackable;
        MaxStackCount = maxStackCount;
        MaxWeightOnTop = maxWeightOnTop;
        AllowedRotations = allowedRotations;
        Barcode = barcode;
        StackGroup = stackGroup;
        IncompatibleGroupsJson = SerializeStringArray(incompatibleGroups);
        SpecialNotes = specialNotes;
        ConstraintIdsJson = SerializeConstraintIds(constraintIds);
        PruneFilledMissingFields();
    }

    public void Approve() => Status = DraftItemStatus.Approved;

    public void Reject() => Status = DraftItemStatus.Rejected;

    /// <summary>ERP guncellemesi reddedilir; urun onaylanmis verisiyle kalir, taslak Approved sayilmaz.</summary>
    public void DismissUpdate() => Status = DraftItemStatus.UpdateDismissed;

    public void ResetToPending() => Status = DraftItemStatus.Pending;

    /// <summary>Reddedilmis ERP guncellemesini tekrar karar bekler duruma alir.</summary>
    public void RestoreUpdatePending() => Status = DraftItemStatus.UpdatePending;

    public void SetUpdatePending(ErpRefresh refresh)
    {
        ApplyErpRefresh(refresh);
        Status = DraftItemStatus.UpdatePending;
    }

    /// <summary>
    /// ERP'den gelen guncel veriyi taslaga uygular. ERP'de bilgi tasimayan alan mevcut
    /// degeri ezmez: olcu/agirlik yalnizca sifirdan buyukse, barkod ve yuk grubu yalnizca
    /// doluysa yazilir. Aksi halde kullanicinin elle doldurdugu eksik alanlar her
    /// senkronda silinirdi.
    /// </summary>
    private void ApplyErpRefresh(ErpRefresh refresh)
    {
        SKU = refresh.Sku;
        Name = refresh.Name;
        ErpRawDataJson = refresh.ErpRawDataJson;

        if (refresh.Width > 0) Width = refresh.Width;
        if (refresh.Height > 0) Height = refresh.Height;
        if (refresh.Length > 0) Length = refresh.Length;
        if (refresh.Weight > 0) Weight = refresh.Weight;

        if (!string.IsNullOrWhiteSpace(refresh.Barcode))
            Barcode = refresh.Barcode;

        if (!string.IsNullOrWhiteSpace(refresh.StackGroup))
        {
            StackGroup = refresh.StackGroup;
            IncompatibleGroupsJson = SerializeStringArray(refresh.IncompatibleGroups);
        }

        MissingFieldsJson = SerializeMissingFields(refresh.MissingFields);
        PruneFilledMissingFields();
    }

    /// <summary>ERP kaynaginda eksik gelen ve halen doldurulmamis alan adlari.</summary>
    public IReadOnlyList<string> GetMissingFields()
    {
        if (string.IsNullOrEmpty(MissingFieldsJson) || MissingFieldsJson == "[]")
            return [];
        try
        {
            return JsonSerializer.Deserialize<string[]>(MissingFieldsJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>Kullanici eksik alani doldurdugunda isareti kaldirir; bayrak bayatlamaz.</summary>
    private void PruneFilledMissingFields()
    {
        var missing = GetMissingFields();
        if (missing.Count == 0)
            return;

        var remaining = missing.Where(IsStillMissing).ToArray();
        if (remaining.Length != missing.Count)
            MissingFieldsJson = SerializeMissingFields(remaining);
    }

    private bool IsStillMissing(string field) => field switch
    {
        DraftItemField.Width => Width <= 0,
        DraftItemField.Height => Height <= 0,
        DraftItemField.Length => Length <= 0,
        DraftItemField.Weight => Weight <= 0,
        _ => true
    };

    private static string SerializeMissingFields(IEnumerable<string>? missingFields)
    {
        var values = missingFields?.Distinct().ToArray() ?? [];
        return values.Length == 0 ? "[]" : JsonSerializer.Serialize(values);
    }

    /// <summary>Kullanicinin sectigi yuk gruplari; hic secilmediyse bos dizi.</summary>
    public string[] GetIncompatibleGroups()
    {
        if (string.IsNullOrEmpty(IncompatibleGroupsJson) || IncompatibleGroupsJson == "[]")
            return [];
        try
        {
            return JsonSerializer.Deserialize<string[]>(IncompatibleGroupsJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string SerializeStringArray(string[]? values)
    {
        if (values is null or { Length: 0 })
            return "[]";
        return JsonSerializer.Serialize(values);
    }

    public int[] GetConstraintIds()
    {
        if (string.IsNullOrEmpty(ConstraintIdsJson) || ConstraintIdsJson == "[]")
            return [];
        try
        {
            return JsonSerializer.Deserialize<int[]>(ConstraintIdsJson) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string SerializeConstraintIds(int[]? constraintIds)
    {
        if (constraintIds is null or { Length: 0 })
            return "[]";
        return JsonSerializer.Serialize(constraintIds);
    }
}
