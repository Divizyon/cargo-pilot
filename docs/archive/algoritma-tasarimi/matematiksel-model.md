# 3D Bin Packing — Matematiksel Model

**Son güncelleme:** 2026-08-04 · **Durum:** Arşiv

{% hint style="warning" %}
Tasarım arşivi — güncel implementasyonun birebir dokümantasyonu değildir. `feature/3D_Packing_Algorithm` branch'inde (2026-05-05) üretildi; `test` branch'teki `CargoPilot.Infrastructure/Services/OptimizationEngine.cs` tarafından geride bırakıldı.

**Bilinen farklar:**
- Koordinat ekseni adlandırması farklıdır. Güncel sözleşme: **X = genişlik, Y = yükseklik, Z = derinlik**, origin kutunun **sol-alt-arka** köşesi (`apps/frontend/.claude/CLAUDE.md`, `lib/config/scene-config.ts`).
- MediatR atıfları hâlâ geçerlidir — güncel mimari: `apps/backend/docs/architecture.md`.
- `Packing/` klasörü ve `PackingEngine` sınıfı `test` branch'inde bulunmamaktadır.

Algoritma çalışması yapılırken kavramsal referans olarak kullanılabilir; kod kaynağı olarak değil.
{% endhint %}

---

## 1. Küme ve Parametre Tanımları

### 1.1 Konteyner

```
C = (L_c, W_c, H_c, W_max)
```

| Sembol | Açıklama | Birim |
|---|---|---|
| L_c | Konteyner uzunluğu (x ekseni, kapıdan içeriye) | metre |
| W_c | Konteyner genişliği (y ekseni, sol→sağ) | metre |
| H_c | Konteyner yüksekliği (z ekseni, alttan üste) | metre |
| W_max | Maksimum yük kapasitesi | kg |

**Koordinat sistemi:** Orijin (0,0,0) konteynırın kapı-sol-alt köşesidir. x ekseni kapıdan içeriye (0 = kapı, L_c = arka duvar), y ekseni soldan sağa, z ekseni alttan yukarıya artar.

### 1.2 Ürün Kümesi

```
P = {P_1, P_2, ..., P_n}

P_i = (l_i, w_i, h_i, mass_i, stackable_i, max_stack_i, lifo_i)
```

| Sembol | Açıklama | Tip |
|---|---|---|
| l_i | Uzunluk (x yönü, temel rotasyonda) | metre |
| w_i | Genişlik (y yönü) | metre |
| h_i | Yükseklik (z yönü) | metre |
| mass_i | Ağırlık | kg |
| stackable_i | Üstüne ürün konulabilir mi | boolean |
| max_stack_i | Üstünde taşıyabileceği maksimum ağırlık | kg (∞ = sınırsız) |
| lifo_i | LIFO sırası (1 = ilk çıkacak, n = son çıkacak) | tam sayı ∣ null |

### 1.3 Sistem Parametreleri

```
θ = (eşik_CG, lifo_aktif, EP_max)
```

| Sembol | Açıklama | Varsayılan |
|---|---|---|
| eşik_CG | İzin verilen maksimum CG sapması (%) | 15 |
| lifo_aktif | LIFO modunun aktif olup olmadığı | false |
| EP_max | Boşluk kalitesi normalizasyonu için referans EP sayısı | 20 |

---

## 2. Rotasyon Modeli

Her ürün P_i için 6 olası rotasyon tanımlanır. Her rotasyon (l_r, w_r, h_r) üçlüsüdür:

```
R_i = {
  r1: (l_i,  w_i,  h_i),
  r2: (l_i,  h_i,  w_i),
  r3: (w_i,  l_i,  h_i),
  r4: (w_i,  h_i,  l_i),
  r5: (h_i,  l_i,  w_i),
  r6: (h_i,  w_i,  l_i)
}
```

Yerleştirmede kullanılan efektif boyutlar (l_r, w_r, h_r) seçili rotasyona göre belirlenir.

---

## 3. Sıralama Katmanı

Sıralama, EP motoruna ürünlerin hangi sırayla verileceğini belirler. Hacim her zaman temel sıralama kriteridir. LIFO aktifse sıralama değişir.

### 3.1 LIFO Kapalı

```
sıra = sort(P, key = V_i, order = DESC)

V_i = l_i × w_i × h_i
```

Hacim büyükten küçüğe sıralama (First Fit Decreasing — sektör standardı).

### 3.2 LIFO Aktif

```
sıra = sort(P, key = lifo_i, order = DESC)
```

Yüksek LIFO indeksi = konteynıra önce girer = konteynırın gerisine yerleşir = en son çıkar.
Düşük LIFO indeksi = konteynıra sonra girer = kapıya yakın yerleşir = ilk çıkar.

**Not:** lifo_i = null olan ürünler LIFO kuyruğunun sonuna eklenir ve kendi aralarında hacme göre sıralanır.

---

## 4. Extreme Point (EP) Modeli

### 4.1 EP Tanımı

Extreme Point, mevcut yerleştirmeler sonucu oluşan ve yeni bir ürünün potansiyel olarak konulabileceği köşe koordinatıdır.

**Başlangıç durumu:**
```
EP_0 = {(0, 0, 0)}
```

### 4.2 EP Üretimi

P_i ürünü (x_a, y_a, z_a) konumuna (l_r, w_r, h_r) rotasyonuyla yerleştirildikten sonra üç yeni EP üretilir:

```
EP_yeni = {
  (x_a + l_r,  y_a,         z_a),    ← sağ köşe
  (x_a,        y_a + w_r,   z_a),    ← ön köşe
  (x_a,        y_a,         z_a + h_r)  ← üst köşe
}
```

### 4.3 Dominance Filtresi

EP listesinin büyümesini önlemek için dominance filtresi uygulanır. EP_p, EP_q'ya dominedir ve EP_q listeden çıkarılır:

```
dominant(EP_p, EP_q) ←→ x_p ≥ x_q  AND  y_p ≥ y_q  AND  z_p ≥ z_q  AND  EP_p ≠ EP_q
```

Dominant EP'ler erişilemez konumlardır — başka bir ürün zaten önlerini kapatmıştır.

---

## 5. Fiziksel Geçerlilik Kontrolleri

Bir (EP, rotasyon) adayı üç fiziksel kontrolü sırasıyla geçmelidir.

### 5.1 Konteyner Sınırı

```
x_a + l_r ≤ L_c
y_a + w_r ≤ W_c
z_a + h_r ≤ H_c
```

### 5.2 Çakışma Kontrolü (AABB)

Yerleşik her P_j ürünüyle eksen hizalı sınır kutusu (Axis-Aligned Bounding Box) kesişim testi:

```
çakışmaz(a, j) ←→
  x_a + l_r ≤ x_j  OR  x_j + l_j ≤ x_a  OR
  y_a + w_r ≤ y_j  OR  y_j + w_j ≤ y_a  OR
  z_a + h_r ≤ z_j  OR  z_j + h_j ≤ z_a

geçer ←→ ∀ P_j ∈ yerleşik: çakışmaz(a, j)
```

### 5.3 Zemin Desteği

Ürünün alt yüzeyinin en az %80'i desteklenmiş olmalıdır (zemin veya altındaki ürünün üst yüzeyi):

```
destek_alanı = alan(alt_yüzey ∩ (zemin ∪ ⋃ üst_yüzey(P_j)))

destek_oranı = destek_alanı / (l_r × w_r)

geçer ←→ destek_oranı ≥ 0.80
```

### 5.4 İstif Kontrolü

```
altındaki_ürün = {P_j | P_j.z + P_j.h_j = z_a  AND  alanlar_kesişiyor(a, j)}

geçer ←→ ∀ P_j ∈ altındaki_ürün:
  P_j.stackable = true  AND
  mevcut_yük(P_j) + mass_i ≤ P_j.max_stack
```

---

## 6. Hard Constraint — Ağırlık Dengesi

### 6.1 Ağırlık Merkezi (İnkremental Güncelleme)

n. ürün yerleştirildikten sonra ağırlık merkezi:

```
M(n) = M(n-1) + mass_n

CG_x(n) = (CG_x(n-1) × M(n-1) + cx_n × mass_n) / M(n)
CG_y(n) = (CG_y(n-1) × M(n-1) + cy_n × mass_n) / M(n)
CG_z(n) = (CG_z(n-1) × M(n-1) + cz_n × mass_n) / M(n)
```

Burada cx_n, cy_n, cz_n ürünün geometrik merkezi:

```
cx_n = x_a + l_r / 2
cy_n = y_a + w_r / 2
cz_n = z_a + h_r / 2
```

**Başlangıç:** CG_x(0) = L_c/2, CG_y(0) = W_c/2, CG_z(0) = 0, M(0) = 0

### 6.2 Sapma Hesabı

Bu adayı yerleştirirsem oluşacak geçici CG:

```
M_temp = M(n-1) + mass_i

CG_x_temp = (CG_x(n-1) × M(n-1) + cx_aday × mass_i) / M_temp
CG_y_temp = (CG_y(n-1) × M(n-1) + cy_aday × mass_i) / M_temp

δ_x = |CG_x_temp − L_c/2| / (L_c/2) × 100   (yüzde)
δ_y = |CG_y_temp − W_c/2| / (W_c/2) × 100   (yüzde)
```

### 6.3 Hard Constraint Karar Kuralı

```
hard_constraint_geçer(aday) ←→
  δ_x ≤ eşik_CG  AND  δ_y ≤ eşik_CG
```

Bu koşulu sağlamayan aday, maliyet fonksiyonuna girmeden elenir.

---

## 7. Maliyet Fonksiyonu

Yalnızca hard constraint filtresini geçmiş adaylara uygulanır.

### 7.1 Terimler

**Zemin yakınlığı:**
```
f_zemin(a) = 1 − (z_a / H_c)
```
z=0 → f_zemin=1.0 (en iyi), z=H_c → f_zemin=0.

**Boşluk kalitesi:**
```
f_boşluk(a) = 1 − (|EP_listesi_sonrası(a)| / EP_max)
```
Bu adayı yerleştirirsem EP listesi kaç elemana çıkar? Az EP = az parçalanmış boşluk = yüksek kalite. EP_max = 20 (normalleştirme sabiti).

**LIFO uyumu** (yalnızca lifo_aktif = true ve P_i.lifo_i ≠ null ise):
```
x_ideal_i = (1 − lifo_i / lifo_max) × L_c

f_lifo(a) = 1 − |x_a − x_ideal_i| / L_c
```
lifo_i = 1 (ilk çıkacak) → x_ideal = 0 (kapıya yakın)
lifo_i = lifo_max (son çıkacak) → x_ideal = L_c (konteynır gerisi)

### 7.2 Ağırlık Vektörü

```
w_zemin  = 0.15   (her zaman sabit)

lifo_aktif = false:
  w_boşluk = 0.85
  w_lifo   = 0.00

lifo_aktif = true:
  w_boşluk = 0.425
  w_lifo   = 0.425
```

### 7.3 Toplam Skor

```
Maliyet(a) = w_zemin  × f_zemin(a)
           + w_boşluk × f_boşluk(a)
           + w_lifo   × f_lifo(a)
```

---

## 8. Aday Seçim Kuralı

### 8.1 Normal Durum

```
G = {a ∈ A_tüm | hard_constraint_geçer(a) = true}

G ≠ ∅  →  a* = argmax_{a ∈ G} Maliyet(a)
```

### 8.2 Fallback Durumu

```
G = ∅  →  a* = argmin_{a ∈ A_tüm} (δ_x(a) + δ_y(a))

uyarı_ekle(P_i, δ_x(a*), δ_y(a*),
           "hard constraint sağlanamadı, en az ihlal eden seçildi")
```

---

## 9. Ana Döngü — Pseudocode

```
INPUT:  C, P, θ
OUTPUT: Sonuç

sıralı_liste ← sırala(P, θ.lifo_aktif)
EP_listesi   ← {(0, 0, 0)}
yerleşimler  ← []
uyarılar     ← []
yerleşmeyen  ← []
CG           ← (L_c/2, W_c/2, 0)
M_toplam     ← 0

FOR P_i IN sıralı_liste:

  A_geçerli ← []
  A_tüm     ← []

  FOR ep IN EP_listesi:
    FOR r IN R_i:   // 6 rotasyon
      a ← (ep, r)

      // Fiziksel kontroller
      IF NOT konteyner_sınırı(a, C):   CONTINUE
      IF NOT çakışma_yok(a, yerleşimler): CONTINUE
      IF NOT zemin_desteği(a, yerleşimler): CONTINUE
      IF NOT istif_geçerli(a, yerleşimler, P_i): CONTINUE

      // CG geçici hesap
      δ_x, δ_y ← hesapla_sapma(a, CG, M_toplam, P_i, C)
      a.δ_x ← δ_x
      a.δ_y ← δ_y

      A_tüm.ekle(a)

      IF δ_x ≤ θ.eşik_CG AND δ_y ≤ θ.eşik_CG:
        A_geçerli.ekle(a)

  IF A_geçerli boş değil:
    a* ← argmax_{a ∈ A_geçerli} Maliyet(a)

  ELSE IF A_tüm boş değil:
    a* ← argmin_{a ∈ A_tüm} (a.δ_x + a.δ_y)
    uyarılar.ekle(P_i, a*.δ_x, a*.δ_y)

  ELSE:
    // Hiçbir EP'ye sığmıyor — boyut veya fiziksel kısıt
    yerleşmeyen.ekle(P_i)
    CONTINUE

  // Yerleştir
  yerleşimler.ekle((P_i, a*.ep, a*.r))
  CG, M_toplam ← güncelle_CG(CG, M_toplam, a*, P_i)
  EP_listesi ← güncelle_EP(EP_listesi, a*, P_i)
  EP_listesi ← dominance_filtresi(EP_listesi)

RETURN Sonuç(yerleşimler, CG, M_toplam, uyarılar, yerleşmeyen)
```

---

## 10. Çıktı Yapısı

```
Sonuç = {
  yerleşimler: [
    {
      urun_id:   string,
      x:         float,   // konteynır koordinatı
      y:         float,
      z:         float,
      rotasyon:  (l_r, w_r, h_r)
    },
    ...
  ],

  CG_final: {
    x: float,   // metre
    y: float,
    z: float,
    δ_x: float, // yüzde — ön/arka sapma
    δ_y: float  // yüzde — sol/sağ sapma
  },

  toplam_agirlik: float,   // kg
  doluluk_orani:  float,   // yüzde (yerleşen ürünler hacmi / C hacmi)

  uyarilar: [
    {
      urun_id: string,
      δ_x:     float,
      δ_y:     float,
      mesaj:   string
    },
    ...
  ],

  yerlesmeyen: [
    {
      urun_id: string,
      sebep:   string  // "boyut aşımı" | "fiziksel kısıt" | "istif ihlali"
    },
    ...
  ]
}
```

---

## 11. Karmaşıklık Analizi

| Adım | Karmaşıklık | Açıklama |
|---|---|---|
| Sıralama | O(n log n) | Tek kriter, standart sort |
| EP başına aday üretimi | O(\|EP\| × 6) | 6 rotasyon × EP sayısı |
| Çakışma kontrolü | O(k) | k = yerleşik ürün sayısı |
| Hard constraint | O(1) | Sabit hesap |
| Maliyet fonksiyonu | O(1) | Sabit hesap |
| Dominance filtresi | O(\|EP\|²) | Her EP çifti karşılaştırması |
| **Toplam (n ürün)** | **O(n² × \|EP\|²)** | Pratik: EP listesi küçük kalır |

Pratik performans: EP listesi dominance filtresi sayesinde genellikle 10–30 eleman arasında kalır. n = 100 ürün için tipik çalışma süresi < 1 saniye.
