using CargoPilot.Application.Common.Erp;

namespace CargoPilot.Application.Common.Interfaces;

/// <summary>
/// Resolves ERP product constraint values to Cargo Pilot rule field values
/// using the constraint-mapping section of <c>Integration.MappingTable</c>.
/// </summary>
public interface IErpConstraintMappingService
{
    /// <summary>
    /// Parses <paramref name="mappingTableJson"/> and resolves each constraint
    /// mapping entry against <paramref name="erpConstraints"/>.
    /// </summary>
    /// <param name="mappingTableJson">JSON stored in <c>Integration.MappingTable</c>; may be null.</param>
    /// <param name="erpConstraints">
    /// Raw ERP product constraint key-value pairs (e.g. "DikTasinacak" → "1").
    /// </param>
    ErpConstraintResolutionResult Resolve(
        string? mappingTableJson,
        IReadOnlyDictionary<string, string?> erpConstraints);
}
