using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Models;

/// <summary>Motorun tek girdisi: araç ölçüleri, ürünler ve optimizasyon tercihleri.</summary>
/// <param name="VehicleWidth">Araç iç genişliği (cm).</param>
/// <param name="VehicleHeight">Araç iç yüksekliği (cm).</param>
/// <param name="VehicleLength">Araç iç uzunluğu (cm).</param>
/// <param name="VehicleMaxWeight">Araç maksimum yük kapasitesi (kg).</param>
/// <param name="Items">Yerleştirilecek ürünler.</param>
/// <param name="Criteria">Optimizasyon kriteri.</param>
/// <param name="LoadingType">Yükleme kapısı yönü.</param>
/// <param name="ClusterGroups">Gruplu ürünlerin bir arada tutulup tutulmayacağı.</param>
/// <param name="Modules">Modül bayrakları. Verilmezse kriterden türetilir.</param>
/// <param name="FillFromMaxX">
/// Yukleme <c>x = width</c> tarafindan mi baslasin. Kapinin oldugu yuzden yukleme
/// baslamaz (docs/COORDINATE_STANDARD.md §7): big door <c>x = 0</c> yuzundeyse
/// baslangic kosesi <c>(width, 0, 0)</c> olur ve doldurma kapiya dogru ilerler.
/// Verilmezse <see cref="LoadingType"/>'dan turetilir; motor <see cref="FillsFromMaxX"/>
/// okur.
/// </param>
/// <param name="Sequencer">
/// Kutu sirasini ureten katman. Varsayilan <see cref="SequencerKind.Static"/> ve
/// bu BILINCLIDIR: motoru dogrudan cagiran her yol (golden snapshot'lar,
/// degismez testleri, doluluk kapisi) saf hesap olan statik yolu alir ve ciktisi
/// makineden bagimsiz bayt kararli kalir. Uretim yolu sequencer'i
/// <see cref="Optimization.SequencerSelection"/> uzerinden alir — orada
/// belirtilmemis sequencer BEAM'e cozulur (DR-56). Beam'in butcesi duvar saati
/// oldugu icin buraya varsayilan olarak konursa snapshot testleri makineye
/// bagli hale gelirdi.
/// </param>
/// <param name="SearchBudget">
/// Aramanin iterasyon/populasyon/sure butcesi. Verilmezse
/// <see cref="Models.SearchBudget.Default"/> gecerlidir. Static sequencer'da
/// kullanilmaz.
/// </param>
/// <param name="SupportThreshold">
/// Asgari zemin destek orani. Verilmezse
/// <see cref="Optimization.PlacementValidator.SupportThreshold"/> gecerlidir —
/// bugunku davranis. Alan bir POLITIKA degeridir, fizik kanunu degil (DR-16);
/// bugun yalnizca olcum duzenegi doldurur, uretim yollari doldurmaz.
/// </param>
/// <param name="FragilityContactOnly">
/// Kirilganlik yorumu. Varsayilan <c>false</c> = bugunku davranis: kirilgan
/// kutunun ayak izi golgesinde HICBIR yukseklikte kutu olamaz (sutun geneli).
/// <c>true</c> ise yalnizca kirilgan kutunun UZERINE OTURAN kutu yasaklanir;
/// komsu yiginlarin tasidigi bir koprü kirilgana dokunmadigi icin serbest kalir.
///
/// Alan bir POLITIKA degeridir, fizik kanunu degil — destek esiginde (DR-16)
/// kurulan desenin aynisi. Sutun geneli yorum hic olculmedi; parametreleme
/// DEGISTIRMEK icin degil OLCMEK icin. Uretim yollari doldurmaz.
/// </param>
/// <param name="UnloadPathVisibilityOnly">
/// LIFO cikarilabilirlik yorumu. Varsayilan <c>false</c> = bugunku davranis:
/// ERISILEBILIRLIK — koridorda herhangi bir kesisme kutuyu cikarilamaz yapar.
/// <c>true</c> ise yalnizca yuzu TAMAMEN kapatan bir kutu engel sayilir
/// (GORUNURLUK, arastirmanin Oneri 4'u).
///
/// Yaklasim IYIMSERDIR: iki kutunun birlikte kapattigi yuzu acik sayar, yani
/// olctugu sey gevsetmenin UST SINIRI. Kural degisikligi is birimi onayi
/// gerektirir; parametreleme OLCMEK icin, uretim yollari doldurmaz.
/// </param>
/// <param name="FragileLast">
/// Kirilgan kutular siranin SONUNA alinsin mi. Varsayilan <c>false</c> = bugunku
/// davranis (yalniz hacim-azalan). <c>true</c> ise kirilganlik BIRINCIL siralama
/// anahtaridir (Krebs-Ehmke DBLF: "non-fragile first"); yerlestirme sirayla
/// yukari ilerledigi icin kirilgan kutu yiginin TEPESINE duser ve muhurledigi
/// sutun boslugu olu olmaktan cikar.
///
/// Kirilgan kutu yoksa anahtar sabittir ve siralama bugunkuyle BIREBIR aynidir.
/// Alan OLCUM icindir (DR-16 deseni); uretim yollari doldurmaz.
/// </param>
/// <param name="FragilityLoadBearing">
/// Kirilganligin DERECELI yorumu: kutunun birim alan basina tasiyabilecegi yuk
/// (kg/m2). Verilmezse (varsayilan) yorum KATEGORIKTIR — kirilganin ustune
/// hicbir sey konamaz.
///
/// Deger verilirse kategorik kapi kalkar ve kirilganlik bir agirlik sinirina
/// cevrilir: sinir ayak iziyle olceklenir, yani buyuk bir palet kucuk bir
/// koliden fazla tasir (Bischoff 2003/2006, Krebs-Ehmke 2021 `lbs`).
///
/// Bu bir POLITIKA degisikligidir, modelleme duzeltmesi degil: kirilgan kutunun
/// ustune GERCEKTEN yuk binmesine izin verir. Alan OLCUM icindir, karar
/// musteriye aittir (DR-16 deseni); uretim yollari doldurmaz.
/// </param>
/// <param name="DepthSlack">
/// Yukun toplanacagi HEDEF DERINLIK payi. Hedef derinlik su sekilde bulunur:
///
///     ideal    = toplam kutu hacmi / (genislik x yukseklik)
///     hedef    = min(arac uzunlugu, ideal x DepthSlack)
///
/// Yerlestirme bu hedefin otesine gecmez; gecemedigi icin yuk aracin onune
/// toplanir. Kutu hedefe sigmazsa hedef ADIM ADIM buyutulur ve kutu yeniden
/// denenir, yani doluluk asla dusmez — pay yalnizca yerin nasil kullanildigini
/// degistirir, ne kadarinin kullanildigini degil.
///
/// Neden gerekli: musteri katman insasini kismi dolulukta yuku tabana yaydigi
/// icin reddetti (DR-12). Olculdu, duvar orucu de ayni yonde kusurlu — ceyrek
/// yukte yuk gerektiginden 1,73 kat derine yayiliyor.
///
/// Varsayilan <c>1,05</c>. Deger OLCULDU ve dolulugu HICBIR yerde dusurmuyor:
/// static BR1-BR7 dort payda da %83,40, beam %89,45. Kismi dolulukta ise yuku
/// one topluyor — yarim yukte yuk derinligi %72,1 → %67,7.
///
/// Bedava olmasinin sebebi tasarim: hedef sert sinir degil, TERCIHTIR. Kutu
/// hedefe sigmazsa hedef adim adim buyur ve kutu yeniden denenir.
///
/// <c>null</c> verilirse sinir yoktur; olcum duzenegi bunu kullanabilir.
/// </param>
/// <param name="VcsWeights">
/// Aday degerlendirme fonksiyonunun dort usteli: hacim, kayip, temas, kutu
/// sayisi (bkz. <see cref="Optimization.WallBuilder.BlockValue"/>). Verilmezse
/// <c>Neutral</c> — dordu de <c>1</c>.
///
/// Alan OLCUM icindir (DR-16'nin SupportThreshold icin kurdugu desen): usteller
/// kaynakta yayinlanmadigi icin taranmak zorunda ve tarama kod degistirmeden
/// yapilabilmeli. Uretim yollari doldurmaz.
/// </param>
/// <param name="Seed">
/// Aramanin rastgelelik tohumu. Ayni tohum + ayni girdi bit birebir ayni plani
/// uretir (R-C02/DR-06). Static sequencer'da kullanilmaz.
/// </param>
public sealed record OptimizationInput(
    decimal VehicleWidth,
    decimal VehicleHeight,
    decimal VehicleLength,
    decimal VehicleMaxWeight,
    IReadOnlyList<OptimizationItemInput> Items,
    LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.VolumeFirst,
    LoadingType LoadingType = LoadingType.Rear,
    bool ClusterGroups = true,
    OptimizationModules? Modules = null,
    bool? FillFromMaxX = null,
    SequencerKind Sequencer = SequencerKind.Static,
    int Seed = 0,
    SearchBudget? SearchBudget = null,
    decimal? SupportThreshold = null,
    bool FragilityContactOnly = false,
    bool UnloadPathVisibilityOnly = false,
    bool FragileLast = true,
    decimal? FragilityLoadBearing = null,
    decimal? DepthSlack = 1.05m,
    (double Volume, double Waste, double Contact, double BoxCount)? VcsWeights = null)
{
    /// <summary>
    /// Yüklemenin gerçekten <c>x = width</c> tarafından başlayıp başlamadığı.
    /// Kapı listesi verilmediyse tekil alandan türetilir; böylece <c>doors</c>
    /// henüz doldurulmamış çağrı yolları bugünkü davranışı korur.
    /// </summary>
    public bool FillsFromMaxX => FillFromMaxX ?? (LoadingType == LoadingType.SideLeft);
}

/// <summary>
/// Optimizasyon modüllerinin açık/kapalı durumu. Verilmezse kriterden türetilir
/// ve türetilmiş değerler bugünkü davranışı birebir üretir.
///
/// Bilinçli olarak dışarıya kapalıdır: hiçbir API sözleşmesine (request DTO,
/// komut, validator, Swagger şeması) bağlanmaz; yalnızca motorun içinden ve
/// testlerden kullanılır.
///
/// **Dörtten ikiye indi (`DR-39`).** `UseVolume` ve `UseWeightBalance` greedy'nin
/// skor terimlerini açıp kapatıyordu; greedy silinince ikisini de okuyan
/// kalmadı. Duvar örücü yalnızca `UseLifo`'yu okur, `UseContamination` ise
/// motorun dışında (handler'da) çalışır.
///
/// **Kriter ölmedi.** `LoadingPlanOptimizationCriteria` üç ayrı yerde hâlâ
/// davranışı değiştiriyor: <c>ItemOrdering.ApplyCriteriaSort</c> (WeightBalance
/// ağırlığa, diğerleri hacme göre sıralar), <c>PlacementValidator</c>
/// (Lifo'da dikey istif kuralı) ve <c>SearchEvaluation.Cost</c> (WeightBalance'ta
/// denge katsayısı 100 kat).
///
/// **AÇIK BORÇ — denge ÜRETİMDE optimize edilmiyor.** `DR-39` denge terimini
/// silerken gerekçesi *"GRASP üretim varsayılanı olduğu için denge sıra düzeyinde
/// optimize edilmeye devam eder"* idi. Sonra `DR-56` varsayılanı BEAM'e çevirdi
/// ve o gerekçe sessizce geçersizleşti: <c>BeamSequencer</c>
/// <c>SearchEvaluation.Cost</c>'u hiç çağırmaz, amacı yalnızca
/// (doluluk, kullanılan uzunluk). Bugün <c>WeightBalance</c> kriterinin üretim
/// yolundaki TEK etkisi ağırlık-azalan sıralamadır; ağırlık merkezi hesaplanıyor
/// ama hiçbir yerde amaç değil.
/// </summary>
public sealed record OptimizationModules(
    bool UseLifo,
    bool UseContamination)
{
    /// <summary>
    /// Bayrakların kriterden türetilmesi: bölge hesabı yalnızca Lifo'da,
    /// kontaminasyon filtresi her zaman.
    /// </summary>
    internal static OptimizationModules FromCriteria(LoadingPlanOptimizationCriteria criteria)
        => new(
            UseLifo: criteria == LoadingPlanOptimizationCriteria.Lifo,
            UseContamination: true);

    /// <summary>Girdideki açık bayraklar, yoksa kriterden türetilmiş varsayılanlar.</summary>
    internal static OptimizationModules Resolve(OptimizationInput input)
        => input.Modules ?? FromCriteria(input.Criteria);
}

public sealed record OptimizationItemInput(
    Guid ItemId,
    string SKU,
    string Name,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    AllowedRotations AllowedRotations,
    int Quantity,
    Guid? GroupId = null,
    int? UnloadingOrder = null,
    string? StackGroup = null,
    IReadOnlyList<string>? IncompatibleGroups = null,
    // Kırılganlık sınıfı. Varsayılan NonFragile bugünkü davranışı birebir korur:
    // alan verilmediğinde hiçbir yeni ret üretilmez
    FragilityType FragilityType = FragilityType.NonFragile);
