using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Units;

public static class UnitConverter
{
    public static decimal ToCentimeters(decimal value, LengthUnit unit)
    {
        return unit switch
        {
            LengthUnit.Cm => value,
            LengthUnit.Mm => value * 0.1m,
            LengthUnit.M => value * 100m,
            LengthUnit.Inch => value * 2.54m,
            LengthUnit.Ft => value * 30.48m,
            _ => throw new ArgumentOutOfRangeException(nameof(unit), unit, "Unsupported length unit.")
        };
    }

    public static decimal ToKilograms(decimal value, WeightUnit unit)
    {
        return unit switch
        {
            WeightUnit.Kg => value,
            WeightUnit.G => value * 0.001m,
            WeightUnit.Lb => value * 0.45359237m,
            _ => throw new ArgumentOutOfRangeException(nameof(unit), unit, "Unsupported weight unit.")
        };
    }
}

