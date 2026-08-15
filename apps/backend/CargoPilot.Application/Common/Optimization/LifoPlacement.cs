using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

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
    /// Yükleme sırası karşılaştırması. Yüksek UnloadingOrder = önce yüklenir =
    /// araç arkası (kapıdan en uzak bölge).
    ///
    /// Aynı yön semantiğini paylaşan üç nokta:
    /// (1) OptimizationEngine.SortForGroupPlacement — grup sıralaması (DESC),
    /// (2) <see cref="ComputeGroupZones"/> — bölge sıralaması (ASC sıra, ilk inen kapıya en yakın),
    /// (3) PlacementValidator.ViolatesStackability — dikey istif kuralı.
    /// </summary>
    internal static int CompareUnloadingOrder(int a, int b) => a.CompareTo(b);

    // ── Grup zone hesaplama ───────────────────────────────────────────────────
    // Arka kapı Z=0'dadır. UnloadingOrder=1 ilk inecek gruptur, bu yüzden kapıya
    // en yakın (en küçük Z) bölgeye düşer. Distinct UnloadingOrder değerleri ASC
    // sıralanır ve kamyon uzunluğu eşit bölümlere ayrılır; sıradaki her grup bir
    // sonraki bölgeye, yani kapıdan daha uzağa yerleşir. 0-1 grup varsa zone
    // uygulanmaz.
    //
    // Buradaki ASC sıra, SortForGroupPlacement'taki DESC grup sırasının ayna
    // görüntüsüdür: en son inecek grup önce yüklenir ve en uzak bölgeye düşer.
    internal static Dictionary<int, (decimal ZStart, decimal ZEnd)> ComputeGroupZones(
        IReadOnlyList<OptimizationItemInput> items,
        decimal vehicleLength,
        LoadingType loadingType,
        bool enabled)
    {
        // Zone ayrımı yalnızca modül açıkken ve arka kapı yüklemesinde geçerli.
        // Kapı yönü bir modül tercihi değil fiziksel gerçektir, bu yüzden bayrak
        // ondan bağımsız kontrol edilir.
        if (!enabled || loadingType != LoadingType.Rear)
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

        for (int i = 0; i < orders.Count; i++)
            zones[orders[i]] = (i * zoneSize, (i + 1) * zoneSize);

        return zones;
    }

    /// <summary>
    /// Aday pozisyonun kendi grubuna ayrılmış bölgeden taşma cezası. Bölge
    /// tanımlı değilse ceza yoktur; taşma iki uçta ayrı ayrı ölçülür.
    /// </summary>
    internal static decimal ZonePenalty(decimal? zoneStart, decimal? zoneEnd, decimal ez, decimal d)
    {
        var zonePenalty = 0m;
        if (zoneStart.HasValue && zoneEnd.HasValue)
        {
            var overLeft  = Math.Max(0m, zoneStart.Value - ez);
            var overRight = Math.Max(0m, (ez + d) - zoneEnd.Value);
            zonePenalty = (overLeft + overRight) * ZoneOverflowPenaltyPerCm;
        }

        return zonePenalty;
    }

    /// <summary>
    /// Aday pozisyon tamamen kendi grubunun bölgesinin içinde mi? Bölge tanımlı
    /// değilse (modül kapalı, arka kapı dışı yükleme, gruplanmamış ürün) kısıt
    /// yoktur ve yüklem her zaman doğrudur.
    ///
    /// Motor bu yüklemi <see cref="ZonePenalty"/> ile birlikte kullanır: önce
    /// bölge içi adaylar arasından seçer, bölge içi hiç aday yoksa cezalı
    /// skorlamaya düşer. Böylece bölge sert kısıt olur ama hiçbir kutu yalnızca
    /// bölgesi dar kaldığı için düşmez.
    /// </summary>
    internal static bool IsInsideZone(decimal? zoneStart, decimal? zoneEnd, decimal ez, decimal d)
        => !zoneStart.HasValue
           || !zoneEnd.HasValue
           || (ez >= zoneStart.Value && ez + d <= zoneEnd.Value);
}
