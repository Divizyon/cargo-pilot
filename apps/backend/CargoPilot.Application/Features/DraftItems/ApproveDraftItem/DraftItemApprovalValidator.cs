using CargoPilot.Application.Common.Items;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItem;

/// <summary>
/// Taslak onayinda Item'a gecmeden once calisan dogrulama. Excel toplu import ile
/// birebir ayni kural setini kullanir; onay yolu artik dogrulamasiz degildir.
/// </summary>
public sealed class DraftItemApprovalValidator : ItemSpecValidatorBase<ItemSpec>
{
}
