using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Sentetik arac ve urun kataloğu.
///
/// Neden sentetik: canli katalog degisken. Bir urun silindiginde ayni tohum
/// baska senaryolar uretir ve tum referans serisi sessizce kopar. Ayrica canli
/// katalogda kirilgan ya da istiflenemez urun yoksa motorun o dali hic
/// kosulmaz — kapsam paneli bunu "test edilemiyor" diye gosteriyordu.
///
/// Bu katalog her sert kisit dalini garanti temsil eder (rulebook R-D08).
/// </summary>
public static class BenchCatalog
{
    /// <summary>
    /// Katalog surumu. Icerik degistiginde artar ve damgaya katilir; eski
    /// kosularla kiyas boylece sessizce yanlis olmaz.
    /// </summary>
    public const int Version = 2;

    public sealed record BenchItem(
        string Code,
        decimal Width,
        decimal Height,
        decimal Length,
        decimal Weight,
        bool IsStackable = true,
        int MaxStackCount = 0,
        decimal MaxWeightOnTop = 0m,
        AllowedRotations AllowedRotations = AllowedRotations.All,
        FragilityType FragilityType = FragilityType.NonFragile,
        string? StackGroup = null,
        IReadOnlyList<string>? IncompatibleGroups = null)
    {
        /// <summary>Kimlik koddan tureti­lir; Guid.NewGuid determinizmi bozardi.</summary>
        public Guid Id => StableId(Code);
    }

    /// <summary>
    /// Kapilar liste olarak modellenir (docs/COORDINATE_STANDARD.md §4); "on/arka
    /// kapi" kavrami yoktur. Yukleme baslangic kosesi listeden turetilir, elle
    /// yazilmaz — ikinci bir kural kaynagi olusmasin diye motorun kendi
    /// <see cref="LoadingCorner"/> mantigi cagrilir.
    /// </summary>
    public sealed record BenchVehicle(
        string Code,
        decimal Width,
        decimal Height,
        decimal Length,
        decimal MaxWeight,
        IReadOnlyList<(DoorType Type, DoorFace Face)> Doors)
    {
        public Guid Id => StableId(Code);

        // Kimlikler koddan turetilir: VehicleDoor bos Guid kabul etmiyor ve
        // Guid.NewGuid determinizmi bozardi.
        public bool FillFromMaxX => LoadingCorner.FillFromMaxX(
            [.. Doors.Select(door => new VehicleDoor(
                StableId($"{Code}-{door.Type}-{door.Face}"), Id, door.Type, door.Face))]) ?? false;

        /// <summary>Tekil alan hala girdi sozlesmesinde; kapi listesinden turetilir.</summary>
        public LoadingType LoadingType
        {
            get
            {
                var big = Doors.FirstOrDefault(door => door.Type == DoorType.Big);

                return big.Face switch
                {
                    DoorFace.ZeroX => LoadingType.SideLeft,
                    DoorFace.WidthX => LoadingType.SideRight,
                    _ => LoadingType.Rear,
                };
            }
        }
    }

    /// <summary>Her satir bir kisit dalini temsil eder; siralama sabittir.</summary>
    public static IReadOnlyList<BenchItem> Items { get; } =
    [
        new("FX-STD-01", 120, 100, 80, 30),
        new("FX-STD-02", 60, 60, 60, 12),
        new("FX-STD-03", 40, 30, 100, 8),
        new("FX-CUBE-01", 50, 50, 50, 10),
        new("FX-LONG-01", 30, 40, 220, 25),
        new("FX-HEAVY-01", 100, 80, 100, 400),
        new("FX-LIGHT-01", 80, 80, 80, 3),
        new("FX-NOSTACK-01", 100, 60, 100, 45, IsStackable: false),
        new("FX-STACK2-01", 80, 40, 80, 20, MaxStackCount: 2),
        new("FX-TOPWEIGHT-01", 100, 50, 100, 35, MaxWeightOnTop: 40m),
        new("FX-FRAGILE-01", 60, 50, 60, 9, FragilityType: FragilityType.Fragile),
        new("FX-FIXED-01", 90, 70, 110, 22, AllowedRotations: AllowedRotations.Fixed),
        new("FX-NOVERT-01", 70, 90, 130, 26, AllowedRotations: AllowedRotations.NoVertical),
        new("FX-PITCH-01", 50, 70, 90, 14, AllowedRotations: AllowedRotations.PitchOnly),
        new("FX-ROLL-01", 60, 80, 60, 16, AllowedRotations: AllowedRotations.RollOnly),
        new("FX-FOOD-01", 80, 60, 80, 18, StackGroup: "food", IncompatibleGroups: ["chemical"]),
        new("FX-CHEM-01", 80, 60, 80, 24, StackGroup: "chemical", IncompatibleGroups: ["food"]),
    ];

    /// <summary>
    /// Arac fixture'lari. V-MIRROR aynalanmis yuklemeyi (big door x = 0) kapsar;
    /// aksi halde motorun yon farkindalgi golden kapsaminin disinda kalirdi.
    /// </summary>
    public static IReadOnlyList<BenchVehicle> Vehicles { get; } =
    [
        new("V-TIR", 240, 245, 1360, 24_000, [(DoorType.Small, DoorFace.LengthZ)]),
        new("V-MINI", 180, 180, 300, 1_500, [(DoorType.Small, DoorFace.LengthZ)]),
        new("V-CUBE", 100, 100, 100, 1_000, [(DoorType.Small, DoorFace.LengthZ)]),
        // Buyuk kapi x = 0 yuzunde: yukleme karsi kenardan baslar (aynalanmis yol).
        new("V-MIRROR", 240, 245, 1360, 24_000, [(DoorType.Big, DoorFace.ZeroX)]),
        new("V-MIX", 240, 245, 1360, 24_000, [(DoorType.Small, DoorFace.LengthZ), (DoorType.Big, DoorFace.WidthX)]),
        new("V-LIGHT", 240, 245, 1360, 800, [(DoorType.Small, DoorFace.LengthZ)]),
    ];

    public static OptimizationItemInput ToInput(
        BenchItem item,
        int quantity,
        Guid? groupId = null,
        int? unloadingOrder = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        return new OptimizationItemInput(
            ItemId: item.Id,
            SKU: item.Code,
            Name: item.Code,
            Width: item.Width,
            Height: item.Height,
            Length: item.Length,
            Weight: item.Weight,
            IsStackable: item.IsStackable,
            MaxStackCount: item.MaxStackCount,
            MaxWeightOnTop: item.MaxWeightOnTop,
            AllowedRotations: item.AllowedRotations,
            Quantity: quantity,
            GroupId: groupId,
            UnloadingOrder: unloadingOrder,
            StackGroup: item.StackGroup,
            IncompatibleGroups: item.IncompatibleGroups,
            FragilityType: item.FragilityType);
    }

    /// <summary>
    /// Koddan turetilen sabit kimlik; ayni kod her kosuda ayni Guid.
    /// <c>Guid.NewGuid</c> kullanilmaz — her kosuda baska kimlik determinizmi bozardi.
    ///
    /// Surum ve varyant bitleri RFC 4122'ye gore duzeltilir: istemci semalari
    /// (zod <c>.uuid()</c>) bicime bakiyor ve ham hash'ten uretilen deger
    /// gecersiz UUID olarak reddediliyordu.
    /// </summary>
    public static Guid StableId(string code)
    {
        ArgumentNullException.ThrowIfNull(code);

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(code));
        var hex = Convert.ToHexString(hash).ToLowerInvariant().AsSpan(0, 32).ToArray();

        hex[12] = '4';
        hex[16] = "89ab"[hash[8] % 4];

        var text = string.Concat(
            new string(hex, 0, 8), "-",
            new string(hex, 8, 4), "-",
            new string(hex, 12, 4), "-",
            new string(hex, 16, 4), "-",
            new string(hex, 20, 12));

        return Guid.Parse(text, CultureInfo.InvariantCulture);
    }

    public static string GroupCode(int number) => "GRP-" + number.ToString(CultureInfo.InvariantCulture);
}
