using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Donme kodunu YERLESMIS olculere cevirir.
///
/// Veritabani kutunun olculerini degil yalnizca donmesini saklar
/// (<see cref="Domain.Entities.LoadingPlanPlacement"/>); yerlesmis olcu, urunun
/// olculeriyle donmenin birlesiminden dogar. Esleme
/// <see cref="LoadingPlanPlacementRotation"/> uzerindeki yorumlarla birebir
/// aynidir ve baska hicbir yerde tekrarlanmamalidir.
/// </summary>
internal static class RotatedDimensions
{
    internal static (decimal Width, decimal Height, decimal Length) Of(
        decimal width,
        decimal height,
        decimal length,
        LoadingPlanPlacementRotation rotation)
        => rotation switch
        {
            LoadingPlanPlacementRotation.Yaw => (length, height, width),
            LoadingPlanPlacementRotation.Pitch => (width, length, height),
            LoadingPlanPlacementRotation.Roll => (height, width, length),
            LoadingPlanPlacementRotation.YawPitch => (height, length, width),
            LoadingPlanPlacementRotation.RollYaw => (length, width, height),
            _ => (width, height, length),
        };
}
