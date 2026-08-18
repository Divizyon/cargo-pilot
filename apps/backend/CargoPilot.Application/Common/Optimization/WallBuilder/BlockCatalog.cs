using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Onceden uretilmis blok katalogu (F7-2).
///
/// Bugunku yerlestirici bloku TEPKISEL uretiyor: once bir kutu yerlesiyor,
/// sonra <c>RaiseBlock</c> cevresine ayni urunun kalanlarini oruyor. Yani blok
/// bir SONUC. Blok tabanli arama (BSG) icin blok bir GIRDI olmali: "bu bosluga
/// hangi blok" sorusunu sorabilmek icin adaylarin onceden elde olmasi gerekir.
///
/// Uretilen her blok tek urundendir ve tek yonelimdedir — <c>nx x ny x nz</c>
/// dizilim. Bilesik bloklar (farkli urunlerin birlesimi) bu adimda YOK: olculdu
/// ve GRASP altinda kazanci sifirdi (bkz. olcum gunlugu, bilesik blok kaydi);
/// literatur de basit->jenerik blok farkini 0,3 puan veriyor. Once basit
/// bloklarla arama semasi kurulur, bilesik blok gerekirse sonra eklenir.
///
/// Katalog SERT KURALLARA uyar: dikey tekrar sayisi istiflenebilirlik,
/// kirilganlik, azami istif ve ustteki azami agirlik kurallariyla sinirlanir.
/// Yasadisi blok uretmek arama butcesini bosa harcamak olurdu.
/// </summary>
internal static class BlockCatalog
{
    /// <summary>
    /// Katalogun ust siniri. Guclu heterojen kumelerde (BR15, 100 tip) uretim
    /// sinirsiz birakilirsa yuz binlerce bloga cikar ve 2 saniyelik butcenin
    /// buyuk kismi katalog uretimine gider.
    /// </summary>
    internal const int DefaultMaxBlocks = 10_000;

    /// <summary>
    /// Tek bir blok: bir urunun <c>nx x ny x nz</c> dizilimi, tek yonelimde.
    /// Dis olculer dizilimin toplamidir.
    /// </summary>
    internal readonly record struct Block(
        OptimizationItemInput Item,
        int Nx,
        int Ny,
        int Nz,
        decimal Width,
        decimal Height,
        decimal Length,
        LoadingPlanPlacementRotation Rotation)
    {
        /// <summary>Blogun tasidigi kutu sayisi.</summary>
        internal int BoxCount => Nx * Ny * Nz;

        /// <summary>Blogun kapladigi hacim; kutular ayni olculu oldugu icin bosluksuzdur.</summary>
        internal decimal Volume => Width * Height * Length;
    }

    /// <summary>
    /// Araca sigabilecek butun basit bloklari uretir, hacme gore azalan sirada.
    ///
    /// Siralamanin ikinci ve ucuncu anahtarlari (kutu sayisi, urun kimligi)
    /// determinizm icindir: esit hacimli iki blok arasinda kazanan makineye ya
    /// da sozluk sirasina birakilamaz (R-C02).
    /// </summary>
    internal static List<Block> Build(OptimizationInput input, int maxBlocks = DefaultMaxBlocks)
    {
        ArgumentNullException.ThrowIfNull(input);

        var blocks = new List<Block>();

        foreach (var item in input.Items)
        {
            if (item.Quantity <= 0) continue;

            var verticalLimit = VerticalLimit(item);

            foreach (var (width, height, length, rotation) in PlacementValidator.GetOrientations(item))
            {
                if (width <= 0m || height <= 0m || length <= 0m) continue;

                var maxX = (int)(input.VehicleWidth / width);
                var maxY = Math.Min(verticalLimit, (int)(input.VehicleHeight / height));
                var maxZ = (int)(input.VehicleLength / length);

                for (var nx = 1; nx <= maxX; nx++)
                {
                    for (var ny = 1; ny <= maxY; ny++)
                    {
                        // Elde bu kadar birim yoksa daha derin dizilim de
                        // olamaz; ic dongu bastan kesilir.
                        if (nx * ny > item.Quantity) break;

                        for (var nz = 1; nz <= maxZ; nz++)
                        {
                            if (nx * ny * nz > item.Quantity) break;

                            blocks.Add(new Block(
                                item, nx, ny, nz,
                                width * nx, height * ny, length * nz,
                                rotation));
                        }
                    }
                }
            }
        }

        blocks.Sort(CompareByValue);

        if (blocks.Count > maxBlocks) blocks.RemoveRange(maxBlocks, blocks.Count - maxBlocks);

        return blocks;
    }

    /// <summary>
    /// Bir urunun ust uste kac kez tekrarlanabilecegi. Dort sert kural birden
    /// baglar; en dar olani kazanir.
    ///
    /// Sutunun EN ALTTAKI kutusu en cok yuku tasir: uzerinde <c>ny - 1</c> kutu
    /// vardir. <see cref="PlacementValidator"/> ayni esigi yerlestirme aninda
    /// da uygular; buradaki sinir onu tekrarlamak icin degil, bastan yasadisi
    /// aday uretmemek icindir.
    /// </summary>
    private static int VerticalLimit(OptimizationItemInput item)
    {
        if (!item.IsStackable) return 1;
        if (item.FragilityType == FragilityType.Fragile) return 1;

        var limit = int.MaxValue;

        if (item.MaxStackCount > 0) limit = item.MaxStackCount + 1;

        if (item.MaxWeightOnTop > 0m && item.Weight > 0m)
        {
            var byWeight = 1 + (int)(item.MaxWeightOnTop / item.Weight);
            if (byWeight < limit) limit = byWeight;
        }

        return Math.Max(1, limit);
    }

    /// <summary>Buyuk hacim once; esitlikte cok kutu, sonra sabit kimlik sirasi.</summary>
    private static int CompareByValue(Block a, Block b)
    {
        var byVolume = b.Volume.CompareTo(a.Volume);
        if (byVolume != 0) return byVolume;

        var byCount = b.BoxCount.CompareTo(a.BoxCount);
        if (byCount != 0) return byCount;

        var byItem = a.Item.ItemId.CompareTo(b.Item.ItemId);
        return byItem != 0 ? byItem : a.Rotation.CompareTo(b.Rotation);
    }
}
