using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Items;

public static class FragilityPolicy
{
    public static AllowedRotations ApplyAllowedRotations(
        AllowedRotations requested,
        FragilityType fragilityType)
    {
        // Constraint model is not implemented yet; until then we only tighten rotations (never loosen).
        return fragilityType switch
        {
            FragilityType.None => requested,
            FragilityType.Glass => MinRestriction(requested, AllowedRotations.NoVertical),
            FragilityType.Electronic => MinRestriction(requested, AllowedRotations.Fixed),
            FragilityType.Liquid => MinRestriction(requested, AllowedRotations.Fixed),
            _ => requested
        };
    }

    private static AllowedRotations MinRestriction(AllowedRotations a, AllowedRotations b)
    {
        // AllowedRotations: All(0) < NoVertical(1) < Fixed(2)
        return (AllowedRotations)Math.Max((int)a, (int)b);
    }
}

