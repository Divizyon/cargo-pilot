using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Items;

/// <summary>
/// Item kurulumunun tek yeri. Excel toplu import, tekil kayit ve ERP taslak onayi
/// ayni alan eslemesini ve istif normalizasyonunu bu factory uzerinden kullanir.
/// </summary>
public static class ItemFactory
{
    public static Item Create(string sku, string name, IItemSpec spec, Guid? companyId)
    {
        var (isStackable, maxStackCount, maxWeightOnTop) = ItemStacking.Normalize(
            spec.IsStackable, spec.MaxStackCount, spec.MaxWeightOnTop, spec.Weight);

        return new Item(
            id: Guid.NewGuid(),
            sku: sku,
            name: name,
            productType: spec.ProductType,
            category: spec.Category,
            width: spec.Width,
            height: spec.Height,
            length: spec.Length,
            weight: spec.Weight,
            fragilityType: spec.FragilityType,
            isStackable: isStackable,
            maxStackCount: maxStackCount,
            maxWeightOnTop: maxWeightOnTop,
            allowedRotations: spec.AllowedRotations,
            barcode: spec.Barcode,
            diameter: spec.Diameter,
            imageUrl: spec.ImageUrl,
            stackGroup: spec.StackGroup,
            incompatibleGroups: spec.IncompatibleGroups,
            specialNotes: spec.SpecialNotes,
            constraintIds: spec.ConstraintIds,
            companyId: companyId);
    }

    /// <summary>Onaylanan taslaktan yeni ERP kaynakli urun uretir.</summary>
    public static Item CreateFromDraft(DraftItem draft, Guid companyId)
    {
        var item = Create(draft.SKU, draft.Name, ItemSpec.FromDraft(draft), companyId);
        item.SetErpSource(draft.ErpId, draft.IntegrationId);
        item.SetRuleAssigned(true);
        return item;
    }

    /// <summary>Onaylanan guncelleme taslagini mevcut urune uygular.</summary>
    public static void ApplyDraft(Item item, DraftItem draft)
    {
        var spec = ItemSpec.FromDraft(draft);
        var (isStackable, maxStackCount, maxWeightOnTop) = ItemStacking.Normalize(
            spec.IsStackable, spec.MaxStackCount, spec.MaxWeightOnTop, spec.Weight);

        item.Update(
            sku: draft.SKU,
            barcode: spec.Barcode,
            name: draft.Name,
            productType: spec.ProductType,
            category: spec.Category,
            width: spec.Width,
            height: spec.Height,
            length: spec.Length,
            diameter: spec.Diameter,
            weight: spec.Weight,
            fragilityType: spec.FragilityType,
            isStackable: isStackable,
            maxStackCount: maxStackCount,
            maxWeightOnTop: maxWeightOnTop,
            allowedRotations: spec.AllowedRotations,
            imageUrl: spec.ImageUrl,
            stackGroup: spec.StackGroup,
            incompatibleGroups: spec.IncompatibleGroups,
            specialNotes: spec.SpecialNotes,
            constraintIds: spec.ConstraintIds);
    }
}
