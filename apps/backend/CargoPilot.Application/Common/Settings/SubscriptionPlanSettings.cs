namespace CargoPilot.Application.Common.Settings;

public sealed class SubscriptionPlanSettings
{
    public PlanPricing Baslangic { get; set; } = new();
    public PlanPricing Buyume { get; set; } = new();
}

public sealed class PlanPricing
{
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyMonthlyPrice { get; set; }

    public int YearlyDiscountPercent =>
        MonthlyPrice > 0
            ? (int)Math.Round((1 - YearlyMonthlyPrice / MonthlyPrice) * 100)
            : 0;
}
