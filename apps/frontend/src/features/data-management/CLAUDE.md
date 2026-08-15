---
description: Squad 1 veri yönetimi kuralları — ürün/araç form şemaları, bağımlı alanlar ve Figma referansları
alwaysApply: true
---

# Squad 1 — Veri Yönetimi Standartları

## Form Şeması

```ts
export const productSchema = z
  .object({
    name: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    length: z.number().positive(),
    weight: z.number().positive(),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1).optional(),
    fragility: z.number().int().min(0).max(2),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
  })
  .refine((d) => !d.isStackable || d.maxStackCount !== undefined, {
    message: 'validations.product.maxStackRequired',
    path: ['maxStackCount'],
  });
```

## Bağımlı Alan

`fragility>=1` → Z (length) ekseni kilitlenir. `useEffect` değil `onChange` içinde:

```ts
onValueChange={(value)=>{
  const n=Number(value); field.onChange(n);
  if(n>=1) form.setValue("allowRotateZ",false);
}}
const fragility=useWatch({control:form.control,name:"fragility"});
```

## Figma Referansı

Sayfa yapısı: `UrunYonetimi`, `AracYonetimi` — tablo + filtre + modal form pattern.

Ürün tipleri: `"Koli"|"Varil"` · Hassasiyet: `"Kırılabilir"|"Sıvı İçerir"|"Ters Çevrilemez"`

Tablo satırı: `bg-white border border-zinc-200 rounded-2xl` · Aksiyon butonları: `ghost` variant.

## Boyut Terimleri

Form/tablo alanlarında `width`/`height`/`length` kullanılır; kullanıcıya gösterilen etiketler Genişlik (X) / Yükseklik (Y) / Uzunluk (Z). "Derinlik" ve "Uzunluk (X)" gibi eski etiketler yasak. Bağlayıcı: `docs/COORDINATE_STANDARD.md`.
