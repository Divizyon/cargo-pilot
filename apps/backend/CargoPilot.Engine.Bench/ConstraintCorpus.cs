using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// BR ornegini KISITLI hale getirir (DR-38).
///
/// Iki korpusumuz da yalnizca hacim olcuyor: <c>UnloadingOrder</c> hep
/// <c>null</c>, hicbir kutu kirilgan degil, istif ve ust agirlik sinirsiz. Yani
/// motorun sekiz sert kapisinin ucu (LIFO bolgesi, kirilganlik, istif sayisi)
/// yedi yuz ornekte HIC ateslenmiyor; bugune kadar yalnizca on yedi elle
/// yazilmis senaryoda sinandilar.
///
/// Bu, iki bosluk demek:
///   OLCUM  — kisitlarin dolulugia MALIYETI bilinmiyor. "LIFO ne kadar
///            kaybettiriyor" sorusunun sayisal cevabi yok.
///   GUVENCE— kisit ihlali yalnizca kucuk bir katalogda araniyor. DepthSlack ile
///            LIFO'nun catistigi hata (DR-57) bu yuzden ancak varsayilan
///            acildiginda ortaya cikti.
///
/// Kisitlar VERIYI DEGISTIRMEZ, uzerine yazilir: ayni kutular, ayni olculer,
/// yalnizca kisit alanlari doldurulur. Boylece kisitli ve kisitsiz kosu birebir
/// kiyaslanabilir ve fark yalnizca kisittan gelir.
/// </summary>
public static class ConstraintCorpus
{
    /// <summary>Hangi kisitlarin uygulanacagi.</summary>
    [Flags]
    public enum Kind
    {
        None = 0,

        /// <summary>Urun tipleri bosaltma gruplarina bolunur; her grup kendi z bandina yerlesir.</summary>
        Lifo = 1,

        /// <summary>Tiplerin bir kismi kirilgan olur: ustune hicbir sey konamaz.</summary>
        Fragile = 2,

        /// <summary>Istif sayisi sinirlanir: bir kutunun ustunde en fazla iki kutu.</summary>
        StackLimit = 4,

        All = Lifo | Fragile | StackLimit,
    }

    /// <summary>Kirilgan isaretlenen tip orani (her ucuncu tip).</summary>
    private const int FragileEvery = 3;

    /// <summary>Istif siniri uygulandiginda bir kutunun ustundeki azami kutu sayisi.</summary>
    private const int MaxStack = 2;

    /// <summary>Bosaltma grubu sayisi.</summary>
    private const int LifoGroups = 3;

    /// <summary>
    /// Kisitlari ornege yazar. Tip SIRASINA gore dagitilir, rastgelelik yoktur:
    /// ayni ornek her kosuda ayni kisitlari alir (R-C02).
    /// </summary>
    public static OptimizationInput Apply(OptimizationInput input, Kind kind)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (kind == Kind.None) return input;

        var items = new List<OptimizationItemInput>(input.Items.Count);

        for (var index = 0; index < input.Items.Count; index++)
        {
            var item = input.Items[index];

            var unloading = kind.HasFlag(Kind.Lifo)
                ? (int?)(index % LifoGroups)
                : item.UnloadingOrder;

            // Kirilgan kutunun ustune yuk binemez; istif sinirini ayrica
            // yazmak anlamsiz olurdu, sert kapi zaten sifirda tutuyor.
            var fragile = kind.HasFlag(Kind.Fragile) && index % FragileEvery == 0;

            var stackCount = kind.HasFlag(Kind.StackLimit) && !fragile
                ? MaxStack
                : item.MaxStackCount;

            // GroupId de doldurulmali: ComputeGroupZones HEM GroupId HEM
            // UnloadingOrder ister, biri eksikse bolge sozlugu BOS doner.
            // Ilk surumde yalniz UnloadingOrder yaziliyordu, dolayisiyla LIFO
            // BOLGELERI hicbir kiyas kosusunda kurulmadi: olculen "LIFO
            // maliyeti" yalnizca siralama kriterinin ve dikey istif kuralinin
            // maliyetiydi, bolge kisitinin degil. Ihlal sayisinin sifir cikmasi
            // da bir guvence degil, bolgelerin hic var olmamasiydi.
            var group = kind.HasFlag(Kind.Lifo)
                ? BenchCatalog.StableId($"lifo-group-{unloading}")
                : item.GroupId;

            items.Add(item with
            {
                GroupId = group,
                UnloadingOrder = unloading,
                FragilityType = fragile ? FragilityType.Fragile : item.FragilityType,
                MaxStackCount = stackCount,
            });
        }

        // LIFO bolgeleri YALNIZCA Lifo kriterinde aciliyor
        // (OptimizationModules.FromCriteria). UnloadingOrder'i doldurup
        // kriteri birakmak, kisitin hic atesLENMEDIGI ama olcumun "LIFO bedava"
        // dedigi bir yanilsama uretir — ilk kosuda tam olarak bu oldu.
        //
        // Kriter degistirmek siralamayi bozmuyor: ApplyCriteriaSort'ta Lifo ve
        // VolumeFirst ayni sirayi veriyor (hacim-azalan), yani olculen fark
        // yalnizca BOLGE kisitindan geliyor.
        var criteria = kind.HasFlag(Kind.Lifo)
            ? LoadingPlanOptimizationCriteria.Lifo
            : input.Criteria;

        return input with { Items = items, Criteria = criteria };
    }

    /// <summary>Bayrak adini komut satiri degerinden cozer.</summary>
    public static Kind Parse(string? value) => (value ?? string.Empty).ToLowerInvariant() switch
    {
        "" or "none" => Kind.None,
        "lifo" => Kind.Lifo,
        "fragile" => Kind.Fragile,
        "stack" => Kind.StackLimit,
        "all" => Kind.All,
        _ => throw new ArgumentException($"--constraints none | lifo | fragile | stack | all bekliyor, geldi: {value}"),
    };
}
