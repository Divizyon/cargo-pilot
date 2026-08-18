using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace CargoPilot.WebAPI.Authentication;

/// <summary>
/// Prometheus scrape kimlik bilgisi icin sabitler.
/// </summary>
public static class MetricsScrapeDefaults
{
    /// <summary>Scrape token'ini dogrulayan authentication scheme adi.</summary>
    public const string AuthenticationScheme = "MetricsScrape";

    /// <summary>Scrape token'i ile kimliklendirilen principal'a verilen claim tipi.</summary>
    public const string ScopeClaimType = "metrics_scope";

    /// <summary>Scrape token'inin tasidigi tek yetki.</summary>
    public const string ReadScope = "read";

    /// <summary>Scrape token'i icin kabul edilen minimum uzunluk.</summary>
    public const int MinimumTokenLength = 32;

    /// <summary>
    /// SuperAdmin JWT'si veya gecerli scrape token'i kabul eden politika adi.
    /// </summary>
    public const string PolicyName = "MetricsAccess";
}

/// <summary>
/// <see cref="MetricsScrapeAuthenticationHandler"/> ayarlari.
/// </summary>
public sealed class MetricsScrapeOptions : AuthenticationSchemeOptions
{
    /// <summary>
    /// Yapilandirilmis scrape token'i (<c>Metrics:ScrapeToken</c>).
    /// Bos ise scheme hicbir istegi kimliklendirmez.
    /// </summary>
    public string? Token { get; set; }
}

/// <summary>
/// <c>Authorization: Bearer &lt;token&gt;</c> basligindaki opak scrape token'ini dogrular.
/// Uretilen principal yalnizca <see cref="MetricsScrapeDefaults.ScopeClaimType"/> claim'ini
/// tasir; bu claim'i baska hicbir politika kabul etmedigi icin token'in kapsami
/// <c>/metrics</c> ve <c>/health/detail</c> ile sinirlidir.
/// </summary>
public sealed class MetricsScrapeAuthenticationHandler : AuthenticationHandler<MetricsScrapeOptions>
{
    private const string BearerPrefix = "Bearer ";

    /// <summary>Handler'i olusturur.</summary>
    public MetricsScrapeAuthenticationHandler(
        IOptionsMonitor<MetricsScrapeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    /// <inheritdoc />
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var configuredToken = Options.Token;

        // Token yapilandirilmamissa davranis degismez: yalnizca SuperAdmin JWT'si gecerlidir.
        if (string.IsNullOrWhiteSpace(configuredToken))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var header = Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(header) ||
            !header.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var presented = header[BearerPrefix.Length..].Trim();
        if (presented.Length == 0 || !TokensMatch(presented, configuredToken))
        {
            // JWT Bearer scheme'inin ayni basligi degerlendirmesini engellememek icin
            // Fail degil NoResult donulur.
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity(
            [new Claim(MetricsScrapeDefaults.ScopeClaimType, MetricsScrapeDefaults.ReadScope)],
            MetricsScrapeDefaults.AuthenticationScheme);

        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(identity),
            MetricsScrapeDefaults.AuthenticationScheme);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    /// <summary>
    /// Iki token'i sabit zamanda karsilastirir; uzunluk farki timing sinyali vermez.
    /// </summary>
    internal static bool TokensMatch(string presented, string configured)
    {
        var presentedBytes = Encoding.UTF8.GetBytes(presented);
        var configuredBytes = Encoding.UTF8.GetBytes(configured);

        return CryptographicOperations.FixedTimeEquals(presentedBytes, configuredBytes);
    }
}
