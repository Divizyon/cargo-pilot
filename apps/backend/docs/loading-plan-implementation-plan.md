# Loading Plan Implementation Plan

Bu dosya, `LoadingPlans` ana tablosunu adim adim uygulamak icin checklist olarak kullanilir.
Her adim tamamlandikca isaretlenecektir.

## Scope

- Ilk fazda yalnizca **ana tablo (`LoadingPlans`)** uygulanir.
- Alt tablolar (`LoadingPlanPlacements`, `LoadingPlanUnplacedItems`, `LoadingPlanWarnings`) sonraki faza birakilir.
- Kaynak sozlesme: `apps/backend/docs/loadings_plan.md`
- Bu is backlog'u boyunca kapsam **backend-only**'dir; frontend tarafinda degisiklik yapilmayacaktir.

## Adimlar

- [x] **Adim 1 - Domain iskeleti**
  - `LoadingPlan` entity olustur (ana tablo alanlari)
  - Enumlari ekle:
    - `LoadingPlanOptimizationCriteria`
    - `LoadingPlanOptimizationStatus`
  - Bu adimda alt tablo entity'leri eklenmeyecek

- [x] **Adim 2 - EF Core configuration**
  - `LoadingPlanConfiguration` dosyasini ekle
  - `decimal` precision/scale ayarlarini uygula
  - string max length kurallarini uygula
  - FK'leri tanimla (`VehicleId`, `CompanyId`)
  - indeks: `IX_LoadingPlans_CompanyId`

- [x] **Adim 3 - DbContext entegrasyonu**
  - `DbSet<LoadingPlan>` ekle
  - `OnModelCreating` icinde `LoadingPlanConfiguration` kaydet

- [x] **Adim 4 - Migration**
  - Yalnizca `LoadingPlans` icin migration olustur
  - Uretilen SQL'i kontrol et:
    - kolon tipleri
    - nullability
    - default degerler
    - FK ve index

- [x] **Adim 5 - Dogrulama**
  - Build al
  - Migration script dogrula
  - `loadings_plan.md` ile alan alan uyum kontrolu yap

## Notlar

- Soft delete davranisi dokumana gore uygulanacak (`IsDeleted`, `DeletedAtUtc`).
- Sayi tiplerinde `double/float` yerine `decimal` kullanilacak.
- Her adim bittiginde bu dosya guncellenip checkbox isaretlenecek.
