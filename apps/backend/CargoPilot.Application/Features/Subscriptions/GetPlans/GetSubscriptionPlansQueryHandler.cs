using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using CargoPilot.Domain.Subscriptions;
using MediatR;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Features.Subscriptions.GetPlans;

internal sealed class GetSubscriptionPlansQueryHandler
    : IRequestHandler<GetSubscriptionPlansQuery, Result<IReadOnlyList<SubscriptionPlanDto>>>
{
    private readonly SubscriptionPlanSettings _settings;

    private static readonly IReadOnlyList<(
        SubscriptionType Type,
        string DisplayName,
        bool ErpAccess,
        bool ReportSharing,
        bool IsRecommended,
        bool IsEnterprise)> PlanFeatures =
    [
        (SubscriptionType.Free,       "Başlangıç", false, false, false, false),
        (SubscriptionType.Pro,        "Büyüme",    true,  true,  true,  false),
        (SubscriptionType.Enterprise, "Kurumsal",  true,  true,  false, true),
    ];

    public GetSubscriptionPlansQueryHandler(IOptions<SubscriptionPlanSettings> settings)
    {
        _settings = settings.Value;
    }

    public Task<Result<IReadOnlyList<SubscriptionPlanDto>>> Handle(
        GetSubscriptionPlansQuery request,
        CancellationToken cancellationToken)
    {
        var plans = PlanFeatures.Select(p =>
        {
            decimal? monthly = null;
            decimal? yearlyMonthly = null;
            int? discountPercent = null;

            if (p.Type == SubscriptionType.Free)
            {
                monthly = _settings.Baslangic.MonthlyPrice;
                yearlyMonthly = _settings.Baslangic.YearlyMonthlyPrice;
                discountPercent = _settings.Baslangic.YearlyDiscountPercent;
            }
            else if (p.Type == SubscriptionType.Pro)
            {
                monthly = _settings.Buyume.MonthlyPrice;
                yearlyMonthly = _settings.Buyume.YearlyMonthlyPrice;
                discountPercent = _settings.Buyume.YearlyDiscountPercent;
            }

            return new SubscriptionPlanDto(
                p.Type.ToString(),
                p.DisplayName,
                p.IsEnterprise ? null : monthly,
                p.IsEnterprise ? null : yearlyMonthly,
                p.IsEnterprise ? null : discountPercent,
                SubscriptionLimits.GetMaxUserCount(p.Type),
                SubscriptionLimits.GetMaxLoadingPlanCount(p.Type),
                SubscriptionLimits.GetMaxVehicleCount(p.Type),
                SubscriptionLimits.GetMaxItemCount(p.Type),
                p.ErpAccess,
                p.ReportSharing,
                p.IsRecommended,
                p.IsEnterprise);
        }).ToList();

        return Task.FromResult(Result<IReadOnlyList<SubscriptionPlanDto>>.Success(plans));
    }
}
