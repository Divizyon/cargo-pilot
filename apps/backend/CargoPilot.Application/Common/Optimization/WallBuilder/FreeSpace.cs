namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Prizmatik bos bolge. Konum kutununkiyle ayni sozlesmeyi tasir: origin'e en
/// yakin kose (min x, min y, min z), birim santimetre.
///
/// <c>Order</c> yaratilis sirasidir ve skor esitliginde son eslik bozucudur;
/// onsuz ayni skorlu iki bosluk arasindaki secim liste sirasina, yani
/// kaldirma/ekleme detayina bagli kalirdi ve determinizm sessizce kaybolurdu.
/// </summary>
internal readonly record struct FreeSpace(
    decimal X,
    decimal Y,
    decimal Z,
    decimal Width,
    decimal Height,
    decimal Length,
    int Order)
{
    public decimal MaxX => X + Width;

    public decimal MaxY => Y + Height;

    public decimal MaxZ => Z + Length;

    public bool IsEmpty => Width <= 0m || Height <= 0m || Length <= 0m;

    /// <summary>Verilen olcu bu bosluga sigar mi.</summary>
    public bool Fits(decimal width, decimal height, decimal length)
        => width <= Width && height <= Height && length <= Length;

    /// <summary>Bu bosluk digerinin tamamen icinde mi (kapsanan bosluk gereksizdir).</summary>
    public bool IsContainedIn(FreeSpace other)
        => X >= other.X && Y >= other.Y && Z >= other.Z
           && MaxX <= other.MaxX && MaxY <= other.MaxY && MaxZ <= other.MaxZ;

    /// <summary>Yerlestirilen kutuyla kesisiyor mu. Temas kesisim sayilmaz.</summary>
    public bool Intersects(decimal x, decimal y, decimal z, decimal width, decimal height, decimal length)
        => X < x + width && x < MaxX
           && Y < y + height && y < MaxY
           && Z < z + length && z < MaxZ;
}
