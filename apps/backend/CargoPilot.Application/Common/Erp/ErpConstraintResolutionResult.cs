namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Result of resolving ERP constraint values against a MappingTableConfig.
/// </summary>
/// <param name="IsFullyResolved">
/// True when every constraint mapping entry in the config was successfully resolved.
/// </param>
/// <param name="UnresolvedKeys">
/// ERP keys that were either absent from the product data or had no matching value in ValueMap.
/// </param>
/// <param name="ResolvedValues">
/// Successfully resolved mappings: targetField name → resolved value string
/// (e.g. "AllowedRotations" → "NoVertical").
/// </param>
public sealed record ErpConstraintResolutionResult(
    bool IsFullyResolved,
    IReadOnlyList<string> UnresolvedKeys,
    IReadOnlyDictionary<string, string> ResolvedValues);
