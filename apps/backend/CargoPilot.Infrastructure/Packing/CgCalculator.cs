using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

internal static class CgCalculator
{
    // §6.2 — Bu adayı yerleştirirsem oluşacak geçici CG ve δ_x, δ_y sapmaları
    internal static (decimal DeltaX, decimal DeltaY, decimal TempCgX, decimal TempCgY, decimal TempCgZ)
        ComputeTempCg(
            ExtremePoint ep,
            Rotation rot,
            ItemSpec item,
            decimal currentCgX,
            decimal currentCgY,
            decimal currentCgZ,
            decimal currentTotalMass,
            ContainerSpec container)
    {
        decimal cx = ep.X + rot.L / 2m;
        decimal cy = ep.Y + rot.W / 2m;
        decimal cz = ep.Z + rot.H / 2m;

        decimal mTemp = currentTotalMass + item.Weight;

        decimal cgXTemp = mTemp == 0
            ? cx
            : (currentCgX * currentTotalMass + cx * item.Weight) / mTemp;

        decimal cgYTemp = mTemp == 0
            ? cy
            : (currentCgY * currentTotalMass + cy * item.Weight) / mTemp;

        decimal cgZTemp = mTemp == 0
            ? cz
            : (currentCgZ * currentTotalMass + cz * item.Weight) / mTemp;

        decimal halfL = container.Length / 2m;
        decimal halfW = container.Width / 2m;

        decimal deltaX = halfL == 0 ? 0 : Math.Abs(cgXTemp - halfL) / halfL * 100m;
        decimal deltaY = halfW == 0 ? 0 : Math.Abs(cgYTemp - halfW) / halfW * 100m;

        return (deltaX, deltaY, cgXTemp, cgYTemp, cgZTemp);
    }

    // §6.1 — Yerleştirme sonrası inkremental CG güncelleme
    internal static (decimal CgX, decimal CgY, decimal CgZ, decimal TotalMass) UpdateCg(
        ExtremePoint ep,
        Rotation rot,
        ItemSpec item,
        decimal currentCgX,
        decimal currentCgY,
        decimal currentCgZ,
        decimal currentTotalMass)
    {
        decimal cx = ep.X + rot.L / 2m;
        decimal cy = ep.Y + rot.W / 2m;
        decimal cz = ep.Z + rot.H / 2m;

        decimal newMass = currentTotalMass + item.Weight;
        decimal newCgX = (currentCgX * currentTotalMass + cx * item.Weight) / newMass;
        decimal newCgY = (currentCgY * currentTotalMass + cy * item.Weight) / newMass;
        decimal newCgZ = (currentCgZ * currentTotalMass + cz * item.Weight) / newMass;

        return (newCgX, newCgY, newCgZ, newMass);
    }
}
