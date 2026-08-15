using CargoPilot.Application.Common.Items;

namespace CargoPilot.Application.Features.DraftItems.UpdateDraftItem;

/// <summary>
/// Taslak duzenleme, Excel toplu import ile ayni Item kural setini kullanir
/// (bkz. <see cref="ItemSpecValidatorBase{T}"/>); taslak yoluna ozel kural yoktur.
/// </summary>
public sealed class UpdateDraftItemCommandValidator : ItemSpecValidatorBase<UpdateDraftItemCommand>
{
}
