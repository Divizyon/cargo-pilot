using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Features.Subscriptions.GetPlans;

internal sealed class GetSubscriptionPlansQueryHandler
    : IRequestHandler<GetSubscriptionPlansQuery, Result<IReadOnlyList<SubscriptionPlanDto>>>
{
    private readonly SubscriptionPlanSettings _settings;

    // Plan başına sabit limitler ve özellikler
    private static readonly IReadOnlyList<(
        SubscriptionType Type,
        string DisplayName,
        int? MaxUsers,
        int? MaxLoadingPlans,
        int? MaxVehicles,
        int? MaxProducts,
        bool ErpAccess,
        bool ReportSharing,
        bool IsRecommended,
        bool IsEnterprise)> PlanFeatures =
    [
        (SubscriptionType.Free,       "Başlangıç", 3,    10,   5,    100,  false, false, false, false),
        (SubscriptionType.Pro,        "Büyüme",    10,   50,   20,   500,  true,  true,  true,  false),
        (SubscriptionType.Enterprise, "Kurumsal",  null, null, null, null, true,  true,  false, true),
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
                p.MaxUsers,
                p.MaxLoadingPlans,
                p.MaxVehicles,
                p.MaxProducts,
                p.ErpAccess,
                p.ReportSharing,
                p.IsRecommended,
                p.IsEnterprise);
        }).ToList();

        return Task.FromResult(Result<IReadOnlyList<SubscriptionPlanDto>>.Success(plans));
    }
}
