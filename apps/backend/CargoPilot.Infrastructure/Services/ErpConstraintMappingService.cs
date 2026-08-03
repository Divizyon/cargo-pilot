using System.Text.Json;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Services;

internal sealed class ErpConstraintMappingService : IErpConstraintMappingService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ErpConstraintResolutionResult Resolve(
        string? mappingTableJson,
        IReadOnlyDictionary<string, string?> erpConstraints)
    {
        if (string.IsNullOrWhiteSpace(mappingTableJson))
            return new ErpConstraintResolutionResult(true, [], new Dictionary<string, string>());

        MappingTableConfig? config;
        try
        {
            config = JsonSerializer.Deserialize<MappingTableConfig>(mappingTableJson, JsonOptions);
        }
        catch (JsonException)
        {
            return new ErpConstraintResolutionResult(
                false,
                ["__invalid_mapping_json__"],
                new Dictionary<string, string>());
        }

        if (config is null || config.ConstraintMappings.Count == 0)
            return new ErpConstraintResolutionResult(true, [], new Dictionary<string, string>());

        var unresolvedKeys = new List<string>();
        var resolvedValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var entry in config.ConstraintMappings)
        {
            if (!erpConstraints.TryGetValue(entry.ErpKey, out var erpValue)
                || string.IsNullOrEmpty(erpValue))
            {
                unresolvedKeys.Add(entry.ErpKey);
                continue;
            }

            if (!entry.ValueMap.TryGetValue(erpValue, out var mappedValue))
            {
                unresolvedKeys.Add(entry.ErpKey);
                continue;
            }

            resolvedValues[entry.TargetField] = mappedValue;
        }

        return new ErpConstraintResolutionResult(
            unresolvedKeys.Count == 0,
            unresolvedKeys,
            resolvedValues);
    }
}
