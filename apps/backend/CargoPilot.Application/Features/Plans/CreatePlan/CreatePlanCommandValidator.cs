using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed class CreatePlanCommandValidator : AbstractValidator<CreatePlanCommand>
{
    public CreatePlanCommandValidator(IOptions<OptimizationSettings> optimizationSettings)
    {
        RuleFor(x => x.PlanName)
            .NotEmpty().WithMessage("Plan adı boş olamaz.")
            .MaximumLength(100).WithMessage("Plan adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.VehicleId)
            .NotEmpty().WithMessage("Araç ID'si boş olamaz.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("İtem listesi boş olamaz.")
            .Must(items => items is null || items.Sum(i => (long)i.Quantity) <= OptimizationLimits.MaxTotalBoxCount)
                .WithMessage($"Toplam kutu sayısı en fazla {OptimizationLimits.MaxTotalBoxCount} olabilir. Yükü birden fazla plana bölün.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ItemId)
                .NotEmpty().WithMessage("İtem ID'si boş olamaz.");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalıdır.");
        });

        When(x => x.Groups is { Count: > 0 }, () =>
        {
            RuleForEach(x => x.Groups).ChildRules(g =>
            {
                g.RuleFor(i => i.ClientGroupId)
                    .NotEmpty().WithMessage("Grup ClientGroupId boş olamaz.");

                g.RuleFor(i => i.Name)
                    .NotEmpty().WithMessage("Grup adı boş olamaz.")
                    .MaximumLength(100).WithMessage("Grup adı en fazla 100 karakter olabilir.");

                g.RuleFor(i => i.Color)
                    .NotEmpty().WithMessage("Grup rengi boş olamaz.")
                    .MaximumLength(50).WithMessage("Grup rengi en fazla 50 karakter olabilir.");

                g.RuleFor(i => i.UnloadingOrder)
                    .GreaterThan(0).WithMessage("Boşaltma sırası 0'dan büyük olmalıdır.");
            });

            RuleFor(x => x.Groups!)
                .Must(groups => groups.Select(g => g.ClientGroupId).Distinct().Count() == groups.Count)
                .WithMessage("Grup ClientGroupId değerleri benzersiz olmalıdır.");

            RuleFor(x => x.Groups!)
                .Must(groups => groups.Select(g => g.UnloadingOrder).Distinct().Count() == groups.Count)
                .WithMessage("Boşaltma sırası değerleri benzersiz olmalıdır.");
        });

        RuleFor(x => x.PlacementStrategy)
            .IsInEnum().WithMessage("Yerleştirme stratejisi geçerli bir değer olmalıdır.");

        RuleFor(x => x.Sequencer)
            .IsInEnum().WithMessage("Sıralayıcı geçerli bir değer olmalıdır.");

        RuleFor(x => x.Seed)
            .GreaterThanOrEqualTo(0).WithMessage("Tohum negatif olamaz.");

        // Deneysel yollar kapaliyken sessizce Greedy'ye dusurulmez; istemci hangi
        // yolun kostugunu bilmeli (ALGORITMA-YOL-HARITASI.md F0-4b).
        RuleFor(x => x)
            .Must(x => optimizationSettings.Value.EnableExperimentalStrategies
                       || (x.PlacementStrategy == PlacementStrategy.Greedy && x.Sequencer == SequencerKind.Static))
            .WithMessage("Deneysel yerleştirme stratejileri bu ortamda kapalıdır.");

    }
}
