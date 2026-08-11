using CargoPilot.Application.Common.Items;
using FluentValidation;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItem;

/// <summary>
/// Taslak onayinda Item'a gecmeden once calisan dogrulama. Excel toplu import ile
/// birebir ayni kural setini kullanir; onay yolu artik dogrulamasiz degildir.
/// Yuk grubu ERP kaynakli urunlerde is kurali geregi zorunludur: bos birakilirsa
/// optimizasyon ayristirma kurallari sessizce devre disi kalir.
/// </summary>
public sealed class DraftItemApprovalValidator : ItemSpecValidatorBase<ItemSpec>
{
    public DraftItemApprovalValidator()
    {
        RuleFor(x => x.IncompatibleGroups)
            .NotEmpty()
                .WithErrorCode("ITEM_VAL_INCOMPATIBLEGROUPS_REQUIRED")
                .WithMessage("Yuk grubu secilmelidir.");
    }
}
