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
    /// Bölge dışına taşmanın santimetre başına cezası. Bölge artık sert kısıt
    /// olduğu için (motor önce bölge içi adaylar arasından seçer) bu katsayı
    /// yalnızca hiç bölge içi aday kalmadığında, yedek kademedeki adayları
    /// kendi aralarında sıralar.
    /// </summary>
    private const decimal ZoneOverflowPenaltyPerCm = 2_000m;

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
        bool zonesApply,
        bool enabled)
    {
        // Zone ayrımı yalnızca modül açıkken ve referans kapıdan (small door,
        // z = length) yükleme yapılırken geçerli: bölgeler z ekseni boyunca
        // dizilir, kapıya yakınlık sırası ancak o kapıdan yükleniyorsa bir şey
        // ifade eder. Kapının varlığı bir modül tercihi değil fiziksel gerçektir,
        // bu yüzden bayrak ondan bağımsız kontrol edilir.
        if (!enabled || !zonesApply)
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
    /// Aday pozisyonun kendi grubuna ayrılmış bölgeden taşma cezası. Bölge
    /// tanımlı değilse ceza yoktur; taşma iki uçta ayrı ayrı ölçülür.
    /// </summary>
    internal static decimal ZonePenalty(decimal? zoneStart, decimal? zoneEnd, decimal ez, decimal length)
    {
        var zonePenalty = 0m;
        if (zoneStart.HasValue && zoneEnd.HasValue)
        {
            var overLeft  = Math.Max(0m, zoneStart.Value - ez);
            var overRight = Math.Max(0m, (ez + length) - zoneEnd.Value);
            zonePenalty = (overLeft + overRight) * ZoneOverflowPenaltyPerCm;
        }

        return zonePenalty;
    }

    /// <summary>
    /// Aday pozisyon tamamen kendi grubunun bölgesinin içinde mi? Bölge tanımlı
    /// değilse (modül kapalı, küçük kapısız araç, gruplanmamış ürün) kısıt
    /// yoktur ve yüklem her zaman doğrudur.
    ///
    /// Motor bu yüklemi <see cref="ZonePenalty"/> ile birlikte kullanır: önce
    /// bölge içi adaylar arasından seçer, bölge içi hiç aday yoksa cezalı
    /// skorlamaya düşer. Böylece bölge sert kısıt olur ama hiçbir kutu yalnızca
    /// bölgesi dar kaldığı için düşmez.
    /// </summary>
    internal static bool IsInsideZone(decimal? zoneStart, decimal? zoneEnd, decimal ez, decimal length)
        => !zoneStart.HasValue
           || !zoneEnd.HasValue
           || (ez >= zoneStart.Value && ez + length <= zoneEnd.Value);
}
