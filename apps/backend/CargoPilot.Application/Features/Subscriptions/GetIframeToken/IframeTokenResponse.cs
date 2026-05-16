namespace CargoPilot.Application.Features.Subscriptions.GetIframeToken;

public sealed record IframeTokenResponse(
    string IframeToken,
    string MerchantOid,
    string PlanName,
    decimal Amount,
    string BillingPeriod);
