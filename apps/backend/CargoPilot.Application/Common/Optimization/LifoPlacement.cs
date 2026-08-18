using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// LIFO (son giren ilk çıkar) yerleşim kuralları: grup bölgelerinin hesabı ve
/// bölge dışına taşma cezası. Motordan çıkarılan saf fonksiyonlardır; durum
/// tutmaz, sıra bağımlılığı yoktur.
///
/// Modülün açık/kapalı olması <see cref="Models.OptimizationModules.UseLifo"/>
/// ile belirlenir; varsayılan türetme yalnızca Lifo kriterinde açıktır. Modül
/// kapalıyken bölge sözlüğü boştur, dolayısıyla bölge tohumlaması da bölge
/// cezası da oluşmaz.
///
/// Tasarım kararı: hepsi <c>static</c>. Sıcak döngüde çağrıldıkları için
/// arayüz/delegate/DI üzerinden sanal çağrı bilinçli olarak kullanılmaz.
///
/// Yön semantiği (bkz. <see cref="CompareUnloadingOrder"/>) motorun üç ayrı
/// yerinde paylaşılır; adlandırma tek noktada tutulur.
/// </summary>
internal static class LifoPlacement
{
    /// <summary>
    /// Yükleme sırası karşılaştırması. Yüksek UnloadingOrder = en son inecek grup =
    /// önce yüklenir = uzak yüz (z = 0) tarafı.
    ///
    /// Aynı yön semantiğini paylaşan üç nokta:
    /// (1) OptimizationEngine.SortForGroupPlacement — grup sıralaması (DESC),
    /// (2) <see cref="ComputeGroupZones"/> — bölge sıralaması (ilk inen kapıya en yakın),
    /// (3) PlacementValidator.ViolatesStackability — dikey istif kuralı.
    /// </summary>
    internal static int CompareUnloadingOrder(int a, int b) => a.CompareTo(b);

    // ── Grup zone hesaplama ───────────────────────────────────────────────────
    // Referans kapı z = length'tedir (docs/COORDINATE_STANDARD.md §2-3).
    // UnloadingOrder=1 ilk inecek gruptur, bu yüzden kapıya en yakın (en büyük Z)
    // bölgeye düşer. Distinct UnloadingOrder değerleri ASC sıralanır, kamyon
    // uzunluğu eşit bölümlere ayrılır ve bölgeler kapıdan geriye doğru dağıtılır;
    // sıradaki her grup uzak yüze (z = 0) bir adım daha yaklaşır. 0-1 grup varsa
    // zone uygulanmaz.
    //
    // Bu dağıtım, SortForGroupPlacement'taki DESC grup sırasının ayna görüntüsüdür:
    // en son inecek grup önce yüklenir ve uzak yüzdeki (z = 0) bölgeye düşer —
    // yükleme yönü de z = 0'dan kapıya doğrudur.
    internal static Dictionary<int, (decimal ZStart, decimal ZEnd)> ComputeGroupZones(
        IReadOnlyList<OptimizationItemInput> items,
        decimal vehicleLength,
        bool enabled)
    {
        // Bölge ayrımı kapı listesinden bağımsızdır: yalnızca LIFO modülü açık
        // olmalı. Önceden referans kapı (small door) aranıyordu ve yalnızca yan
        // kapısı olan araçta bölgeler hiç kurulmuyordu — kullanıcı LIFO'yu
        // seçebiliyor, sıralama işliyor ama bölge kısıtı sessizce devre dışı
        // kalıyordu.
        //
        // Bölgeler z ekseni boyunca dizilir ve ilk inecek grup z = length ucunu
        // alır. Bu, kapının fiziken orada olmasını gerektirmez; boşaltma
        // sırasının bir ucu vardır ve gruplar o uca göre ayrılır.
        if (!enabled)
            return [];

        var orders = items
            .Where(i => i.GroupId.HasValue && i.UnloadingOrder.HasValue)
            .Select(i => i.UnloadingOrder!.Value)
            .Distinct()
            .OrderBy(o => o)
            .ToList();

        if (orders.Count <= 1)
            return [];

        var zoneSize = vehicleLength / orders.Count;
        var zones = new Dictionary<int, (decimal ZStart, decimal ZEnd)>();

        // i = 0 (ilk inecek grup) kapı ucundaki bölgeyi alır; indeks büyüdükçe
        // bölge uzak yüze kayar.
        //
        // Son bölgenin başlangıcı 0'a sabitlenir: vehicleLength / orders.Count
        // bölünmesi decimal'de tam kapanmayabilir (250/3 → son bölge ZStart
        // 1E-26). Kalıntı sıfırdan büyük olduğu anda bölge sert kısıt olmaktan
        // çıkıp yumuşak cezaya düşerdi.
        for (int i = 0; i < orders.Count; i++)
        {
            var isLast = i == orders.Count - 1;
            var zStart = isLast ? 0m : vehicleLength - (i + 1) * zoneSize;
            zones[orders[i]] = (zStart, vehicleLength - i * zoneSize);
        }

        return zones;
    }

    /// <summary>
    /// Aday pozisyon tamamen kendi grubunun bölgesinin içinde mi? Bölge tanımlı
    /// değilse (modül kapalı, küçük kapısız araç, gruplanmamış ürün) kısıt
    /// yoktur ve yüklem her zaman doğrudur.
    ///
    /// Duvar örücü bunu iki kademeli seçimde kullanır: önce bölge içi adaylar
    /// arasından seçer, hiç bölge içi aday yoksa bölge dışı adayı kabul eder.
    /// Böylece bölge sert kısıt gibi davranır ama hiçbir kutu yalnızca bölgesi
    /// dar kaldığı için düşmez.
    ///
    /// Greedy'nin `ZonePenalty` yedek sıralaması kaldırıldı (`DR-39`): o, bölge
    /// dışı adayları "bölgeye ne kadar yakın" diye sıralıyordu ve duvar örücüde
    /// karşılığı yok — bölge dışına düşen adaylar arasında bir tercih kalmadı.
    /// </summary>
    internal static bool IsInsideZone(decimal? zoneStart, decimal? zoneEnd, decimal ez, decimal length)
        => !zoneStart.HasValue
           || !zoneEnd.HasValue
           || (ez >= zoneStart.Value && ez + length <= zoneEnd.Value);
}
