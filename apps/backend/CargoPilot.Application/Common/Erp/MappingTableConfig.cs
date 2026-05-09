namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// JSON format for Integration.MappingTable – constraint-mapping section.
/// Example JSON:
/// {
///   "constraintMappings": [
///     {
///       "erpKey": "DikTasinacak",
///       "targetField": "AllowedRotations",
///       "valueMap": { "1": "NoVertical", "Evet": "NoVertical", "0": "All", "Hayir": "All" }
///     }
///   ]
/// }
/// </summary>
public sealed class MappingTableConfig
{
    public IReadOnlyList<ErpConstraintMappingEntry> ConstraintMappings { get; init; } = [];

    public static readonly MappingTableConfig Empty = new();
}

/// <summary>
/// Maps a single ERP constraint key to a Cargo Pilot rule field.
/// <c>TargetField</c> must be one of: AllowedRotations, IsStackable,
/// MaxStackCount, MaxWeightOnTop, FragilityType.
/// <c>ValueMap</c> keys are ERP string values; values are the target enum/type name.
/// </summary>
public sealed class ErpConstraintMappingEntry
{
    /// <summary>ERP field key as it arrives in the product constraint payload.</summary>
    public string ErpKey { get; init; } = string.Empty;

    /// <summary>Cargo Pilot Item field to populate (e.g. "AllowedRotations").</summary>
    public string TargetField { get; init; } = string.Empty;

    /// <summary>ERP value → Cargo Pilot enum/value name mapping.</summary>
    public IReadOnlyDictionary<string, string> ValueMap { get; init; } =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
}
