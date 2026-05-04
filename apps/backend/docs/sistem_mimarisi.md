# 3D Bin Packing — Sistem Mimarisi ve Gereksinim Dokümantasyonu

## 1. Problem Tanımı

Boyutları ve ağırlıkları bilinen ürünlerin, boyutları ve kapasitesi tanımlanmış bir konteyner veya araca optimum şekilde yerleştirilmesi gerekiyor. Sistem, yerleştirme sırasında fiziksel kısıtları (çakışma, boyut sınırı, zemin desteği, istif kuralları) zorunlu olarak sağlamalı; ağırlık dengesini her durumda aktif bir kısıt olarak izlemeli ve LIFO erişim sıralaması opsiyonel olarak desteklemelidir.

Bu problem NP-Hard sınıfında Constrained 3D Bin Packing Problem (3D-BPP) olarak tanımlanır. Tek bir konteyner (sabit bin) ve değişken ürün kümesi söz konusudur.

---

## 2. Seçilen Algoritma Yaklaşımı

**Hibrit Extreme Point (EP) tabanlı yerleştirici.**

İki bağımsız katmandan oluşur:

**Katman A — Sıralama motoru:** EP motoruna ürünlerin hangi sırayla verileceğini belirler. Strateji: hacim büyükten küçüğe (First Fit Decreasing). LIFO aktifse sıralama LIFO indeksine göre değişir.

**Katman B — EP motoru:** Her ürün için geçerli yerleştirme konumlarını (Extreme Point + rotasyon kombinasyonları) üretir, fiziksel kontrolleri uygular, CG hard constraint filtresinden geçirir ve maliyet fonksiyonu ile en iyi konumu seçer.

### Neden bu yaklaşım?

| Alternatif | Neden seçilmedi |
|---|---|
| Genetik algoritma | 10–60 sn yakınsama, gerçek zamanlı kullanıma uygun değil |
| Deep Reinforcement Learning | Eğitim altyapısı gerektirir, kararlar açıklanamaz |
| Layer-by-layer | Hacim verimliliği düşük |
| Sadece zone-based denge | Bölge içi CG kaymasını görmez, dinamik değil |

EP yaklaşımı gerçek zamanlı çalışır, tüm kısıtları tek döngüye entegre eder ve sektörde CargoWiz, Cube-IQ, LoadXpert gibi ticari yazılımların çekirdeğinde kullanılır.

---

## 3. Sistem Girdileri

### 3.1 Konteyner / Araç Tanımı

```
{
  uzunluk:          float,   // metre — x ekseni (kapı → arka)
  genislik:         float,   // metre — y ekseni (sol → sağ)
  yukseklik:        float,   // metre — z ekseni (alt → üst)
  max_yuk:          float,   // kg — toplam ağırlık kapasitesi
  arac_tipi:        enum     // "konteyner" | "tir" | "platform"
}
```

**Koordinat sistemi:** Orijin (0,0,0) konteynırın kapı-sol-alt köşesidir. x=0 kapı, x=uzunluk arka duvardır.

### 3.2 Ürün Listesi

Her ürün için:

```
{
  id:           string,
  uzunluk:      float,    // metre
  genislik:     float,    // metre
  yukseklik:    float,    // metre
  agirlik:      float,    // kg
  istiflenebilir: boolean,  // üstüne ürün konulabilir mi
  max_istif:    float,    // kg — üstünde taşıyabileceği max ağırlık (null = sınırsız)
  lifo_index:   int       // null = LIFO dışı ürün
}
```

### 3.3 Kullanıcı Parametreleri

```
{
  lifo_aktif:   boolean,  // LIFO modunu etkinleştir
  cg_esik:      float     // ağırlık dengesi toleransı (%, default: 15)
}
```

**Önemli:** Hacim optimizasyonu bir kullanıcı seçeneği değildir — her zaman aktiftir ve algoritmanın doğasında bulunur. Kullanıcı yalnızca LIFO'yu açıp kapayabilir ve CG eşiğini ayarlayabilir.

---

## 4. Sistem Mimarisi — Katmanlar ve Sorumluluklar

### 4.1 Girdi Doğrulama Katmanı

Algoritma çalışmadan önce zorunlu kontroller:

- Tüm boyutlar pozitif sayı mı?
- Toplam ürün ağırlığı konteyner kapasitesini aşıyor mu? (aşıyorsa uyarı, devam et)
- LIFO indeksleri unique mi? (çakışma varsa hata döndür)
- lifo_aktif = true ama hiçbir ürünün lifo_index'i yok mu? (uyarı ver)

### 4.2 Sıralama Katmanı (Katman A)

**LIFO kapalıyken:**
Ürünler hacim büyükten küçüğe sıralanır. Bu First Fit Decreasing (FFD) standardıdır ve EP motoruna en büyük ürünü önce vererek konteynırın ana blok yapısını erken oluşturur — sonraki küçük ürünler boşluklara dolar.

**LIFO açıkken:**
Ürünler LIFO indeksine göre büyükten küçüğe sıralanır (yüksek index = konteynıra önce girer = konteynır gerisine yerleşir = en son çıkar). lifo_index = null olan ürünler kuyruğun sonuna eklenir ve kendi aralarında hacme göre sıralanır.

**Kritik:** Ağırlık hiçbir zaman sıralama kriteri değildir. Ağırlık dengesi EP motorunun CG hard constraint mekanizması tarafından yönetilir.

### 4.3 EP Motoru — Aday Üretimi (Katman B)

Her ürün için şu adımlar sırayla çalışır:

**Adım 1 — Aday üretimi:**
Mevcut EP listesindeki her nokta için 6 rotasyon denenir. Her (EP, rotasyon) çifti bir aday oluşturur.

**Adım 2 — Fiziksel kontroller (sırasıyla):**
1. Konteyner sınırı: ürün konteynır dışına taşıyor mu?
2. Çakışma kontrolü: yerleşik ürünlerle AABB kesişimi var mı?
3. Zemin desteği: alt yüzeyin en az %80'i destekleniyor mu?
4. İstif kontrolü: altındaki ürün istiflenebilir mi, max yük aşılıyor mu?

Bu dört kontrolden birini geçemeyen aday doğrudan elenir.

**Adım 3 — Hard constraint filtresi (CG kontrolü):**
Fiziksel kontrolü geçen her aday için "bu adayı yerleştirirsem ağırlık merkezi nereye gider?" hesaplanır. CG sapması (hem ön-arka hem sol-sağ ekseninde) kullanıcının belirlediği eşiği aşıyorsa aday elenir.

**Adım 4 — Maliyet fonksiyonu:**
Hard constraint'i geçen adaylar maliyet skoru ile değerlendirilir. En yüksek skorlu aday seçilir.

**Adım 5 — Fallback:**
Hiçbir aday hard constraint'i geçemediyse — tüm adaylar CG eşiğini aşıyorsa — en az ihlal eden seçilir ve uyarı üretilir.

**Adım 6 — Hiçbir EP'ye sığmıyorsa:**
Ürün fiziksel olarak konteyner içine sığmıyorsa "yerleştirilemeyen" listesine alınır, algoritma bir sonraki ürüne geçer.

### 4.4 Maliyet Fonksiyonu

```
Maliyet(aday) = 0.15 × zemin_yakınlığı(aday)
              + w_boşluk × boşluk_kalitesi(aday)
              + w_lifo   × lifo_uyumu(aday)
```

**Ağırlıklar:**

| LIFO durumu | w_boşluk | w_lifo |
|---|---|---|
| LIFO kapalı | 0.85 | 0.00 |
| LIFO açık | 0.425 | 0.425 |

**Zemin yakınlığı:** `1 − (z / H_c)` — ürün ne kadar altta olursa skor o kadar yüksek.

**Boşluk kalitesi:** `1 − (EP_sonrası / 20)` — bu adayı koyarsam EP listesi kaç elemana çıkar? Az EP = boşluk az parçalandı = iyi.

**LIFO uyumu:** Ürünün LIFO indeksine göre hesaplanan ideal x pozisyonuna ne kadar yakın? `1 − |x_aday − x_ideal| / L_c`

**Önemli:** Ağırlık dengesi maliyet fonksiyonunda değildir. CG hard constraint adım 3'te aday eleme yapar; maliyet fonksiyonu yalnızca hayatta kalan adayları sıralar.

### 4.5 CG Monitör

Her ürün yerleştirildikten sonra ağırlık merkezi inkremental olarak güncellenir. Bu güncelleme hem bir sonraki adımın CG hesabı için gereklidir hem de nihai çıktı raporuna dahil edilir.

---

## 5. Kısıtlar ve Öncelik Sırası

Tüm kısıtlar iki kategoriye ayrılır:

### 5.1 Hard Constraints — Asla İhlal Edilemez

1. Konteyner sınırı aşılamaz
2. Ürünler birbirine geçemez (çakışma)
3. Zemin desteği %80 altına düşemez
4. `stackable = false` olan ürünün üstüne ürün konulamaz
5. `max_stack` değeri aşılamaz
6. CG sapması eşik değerini aşan konuma yerleştirme yapılamaz (fallback hariç)

### 5.2 Soft Objectives — Optimize Edilir

1. Hacim verimliliği (boşluk kalitesi terimi)
2. LIFO erişim sırası uyumu
3. Zemin yakınlığı

### 5.3 Çakışan Kısıt Senaryoları

**LIFO + CG çakışması:**
LIFO indeksi 1 olan ürün kapıya yakın olmak zorundadır ama ağır bir ürünse CG bunu engelliyor olabilir. Bu durumda CG hard constraint uygulanır — LIFO ideal pozisyon sağlanamıyorsa fallback devreye girer ve uyarı üretilir. LIFO sırası bozulmaz ama pozisyon idealsizleşebilir.

**İstif kuralı + hacim verimliliği çakışması:**
`stackable = false` olan büyük bir ürün her zaman üst katmana yerleşir, üstüne hiçbir şey konulamaz. Bu hacim verimliliğini düşürür. Kabul edilir bir durumdur, raporda doluluk oranı düşük olarak gösterilir.

**Hiçbir konum CG'yi sağlamıyorsa:**
Fallback mekanizması devreye girer. Bu durum yükün yapısal olarak dengelenememesi anlamına gelir; uyarı üretilir ve operatöre bildirilir.

---

## 6. Araç Tipi Davranış Farkları

| Araç tipi | CG kontrolü | Aks hesabı | Notlar |
|---|---|---|---|
| Konteyner (statik) | Opsiyonel | Yok | Hareket yok, CG zorunlu değil |
| Tır / dorse | Zorunlu | Ön/arka aks | VDI 2700 uyumu gerekir |
| Platform araç | Zorunlu | Tüm akslar | Aks pozisyonları tanımlanmalı |

**Taşımacılık senaryolarında** (tır, platform) CG hard constraint kapatılamaz — yalnızca eşik değeri ayarlanabilir.

**Statik depo senaryosunda** CG kontrolü opsiyoneldir.

---

## 7. Sistem Çıktıları

### 7.1 Başarılı Yerleşim

```
{
  yerlesimler: [
    {
      urun_id:   string,
      x:         float,   // konteynır koordinatı (köşe noktası)
      y:         float,
      z:         float,
      rotasyon:  {l: float, w: float, h: float}
    }
  ],
  cg_final: {
    x:    float,   // metre
    y:    float,
    z:    float,
    d_x:  float,   // ön-arka sapma yüzdesi
    d_y:  float    // sol-sağ sapma yüzdesi
  },
  toplam_agirlik: float,
  doluluk_orani:  float    // yüzde
}
```

### 7.2 Uyarılar

Her fallback tetiklendiğinde:

```
{
  urun_id:   string,
  d_x:       float,
  d_y:       float,
  mesaj:     "CG eşiği sağlanamadı — en az ihlal eden konum seçildi"
}
```

CG sapması eşiği geçtiğinde (genel):

```
{
  mesaj:   "Yük dengesi eşik aşıldı",
  d_x:     float,
  d_y:     float,
  yön:     "arka ağır" | "ön ağır" | "sağ ağır" | "sol ağır"
}
```

### 7.3 Yerleştirilemeyen Ürünler

```
{
  urun_id:  string,
  sebep:    "boyut aşımı" | "fiziksel kısıt" | "istif ihlali" | "kapasite aşımı"
}
```

---

## 8. Performans Gereksinimleri

- n ≤ 50 ürün: < 500ms
- n ≤ 100 ürün: < 2 saniye
- n ≤ 200 ürün: < 10 saniye
- EP listesi dominance filtresi ile 10–30 eleman arasında tutulmalı
- Çakışma kontrolü AABB testi ile O(k) — k yerleşik ürün sayısı

---

## 9. Sınırlamalar ve Bilinen Kısıtlar

**Lokal optimum riski:**
EP algoritması ileriye bakmaz (greedy). Sıralama yanlışsa veya erken yerleştirmeler kötü EP'ler üretirse sonuç lokal optimumda takılabilir. Küresel optimum garantisi yoktur — bu sektördeki tüm gerçek zamanlı yerleştirici algoritmalar için geçerlidir.

**Rotasyon kısıtı yok:**
Şu anki modelde 6 rotasyonun tümü denenir. Belirli ürünlerin belirli rotasyonlarda taşınması gerekiyorsa (örneğin "bu ürün yatırılamaz") ürün tanımına `izinli_rotasyonlar` parametresi eklenmeli ve rotasyon döngüsü buna göre filtrelenmelidir.

**Aks hesabı:**
Aks dengesi (ön aks / arka aks yük dağılımı) bu modelde CG_x üzerinden dolaylı olarak yönetilir. Aks pozisyonları ve maksimum aks kapasitesi tanımlanmışsa ek bir aks kontrolü hard constraint katmanına eklenmelidir.

**Çok konteyner desteği:**
Bu model tek konteyner (single bin) için tasarlanmıştır. Birden fazla konteynıra dağıtım (multi-bin packing) ayrı bir dış döngü gerektirir.

---

## 10. Implementasyon Direktifleri

### 10.1 Veri Yapıları

```
EP listesi:     min-heap (z'ye göre, düşük z önce)
Yerleşik ürünler: spatial index (R-tree veya grid) — çakışma testi için
Aday listesi:   max-heap (maliyet skoruna göre)
```

### 10.2 Kritik Implementasyon Notları

**EP üretimi:** Her yerleştirmeden sonra 3 yeni EP üretilir. Dominance filtresi hemen uygulanır. EP listesi 30'u geçerse en düşük skorlu EP'ler temizlenir.

**CG inkremental:** Her yerleştirmeden sonra CG güncellenir. Tüm liste baştan hesaplanmaz. Formül: `CG_yeni = (CG_eski × M_eski + cx_yeni × mass_yeni) / (M_eski + mass_yeni)`

**Floating point:** Tüm geometrik karşılaştırmalarda epsilon toleransı kullanılmalı (ε = 1e-6). İki yüzeyin tam üst üste olup olmadığı testi `|z1 - z2| < ε` şeklinde yapılmalı.

**Zemin desteği:** Alt yüzey kesişim alanı hesabı dikdörtgen kesişimi ile yapılır. Her iki boyutta min/max karşılaştırması yeterlidir.

### 10.3 Test Senaryoları

Implementasyon doğruluğu için minimum test kümesi:

1. **Tek ürün:** Konteyner boyutuna tam sığan bir ürün → x=0, y=0, z=0'a yerleşmeli
2. **İki ürün yan yana:** İkisi birlikte konteyner genişliğini dolduruyor → çakışma olmamalı
3. **İstif:** stackable=false ürünün üstüne ürün konulmamalı
4. **CG ihlali fallback:** Tüm adaylar CG'yi bozuyorsa uyarı üretilmeli
5. **LIFO sırası:** lifo_index=1 olan ürün en düşük x koordinatına sahip olmalı
6. **Sığmayan ürün:** Konteynırdan büyük ürün yerleştirilemeyen listesine girmeli
7. **Doluluk oranı:** 10 birim küp ürün, 100 birim küp konteyner → %10 doluluk

---

## 11. Referans Standartlar

- **VDI 2700:** Kara taşımacılığında yük emniyeti — CG toleransı referansı
- **EUMOS 40509:** Yük testi ve denge standartları
- **First Fit Decreasing (FFD):** Bin packing sıralama standardı
- **AABB collision detection:** Gerçek zamanlı çakışma testi standardı
