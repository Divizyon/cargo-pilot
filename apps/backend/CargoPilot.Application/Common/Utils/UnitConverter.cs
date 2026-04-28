using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Utils;

internal static class UnitConverter
{
    public static decimal ToCm(decimal value, DimensionUnit unit) => unit switch
    {
        DimensionUnit.Cm   => value,
        DimensionUnit.Mm   => value * 0.1m,
        DimensionUnit.M    => value * 100m,
        DimensionUnit.Inch => value * 2.54m,
        DimensionUnit.Ft   => value * 30.48m,
        _                  => value
    };

    public static decimal ToKg(decimal value, WeightUnit unit) => unit switch
    {
        WeightUnit.Kg => value,
        WeightUnit.G  => value * 0.001m,
        WeightUnit.Lb => value * 0.453592m,
        _             => value
    };
}
