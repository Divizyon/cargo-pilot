using System.Security.Claims;
using CargoPilot.WebAPI.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CargoPilot.WebAPI.Tests;

/// <summary>
/// SEC-07 takibi: /metrics ve /health/detail hem SuperAdmin JWT'si hem de dar kapsamli
/// scrape token'i ile erisilebilir olmali; scrape token'i baska hicbir yetki vermemeli.
/// </summary>
public sealed class MetricsScrapeAuthenticationTests
{
    private const string ValidToken = "Zt7Kq2Wm9Rd4Xs1PbNv6HyGc3JuLf8Ao";
    private const string PlaceholderToken = "<CHANGE_ME_METRICS_SCRAPE_TOKEN_VALUE>";

    private static IConfiguration Configuration(params (string Key, string? Value)[] entries) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(entries.Select(e => new KeyValuePair<string, string?>(e.Key, e.Value)))
            .Build();

    private static AuthorizationPolicy MetricsPolicy()
    {
        var services = new ServiceCollection();
        services.AddAuthorization(options =>
        {
            options.AddPolicy(MetricsScrapeDefaults.PolicyName, policy =>
            {
                policy.AddAuthenticationSchemes(
                    JwtBearerDefaults.AuthenticationScheme,
                    MetricsScrapeDefaults.AuthenticationScheme);

                policy.RequireAssertion(context =>
                    context.User.HasClaim("role", "SuperAdmin") ||
                    context.User.HasClaim(
                        MetricsScrapeDefaults.ScopeClaimType,
                        MetricsScrapeDefaults.ReadScope));
            });
        });

        using var provider = services.BuildServiceProvider();
        var policy = provider.GetRequiredService<IAuthorizationPolicyProvider>()
            .GetPolicyAsync(MetricsScrapeDefaults.PolicyName)
            .GetAwaiter()
            .GetResult();

        Assert.NotNull(policy);
        return policy;
    }

    private static bool IsAuthorized(ClaimsPrincipal user)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization();

        using var provider = services.BuildServiceProvider();

        return provider.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(user, resource: null, MetricsPolicy())
            .GetAwaiter()
            .GetResult()
            .Succeeded;
    }

    private static ClaimsPrincipal ScrapePrincipal() =>
        new(new ClaimsIdentity(
            [new Claim(MetricsScrapeDefaults.ScopeClaimType, MetricsScrapeDefaults.ReadScope)],
            MetricsScrapeDefaults.AuthenticationScheme));

    private static ClaimsPrincipal SuperAdminPrincipal() =>
        new(new ClaimsIdentity(
            [new Claim("role", "SuperAdmin")],
            JwtBearerDefaults.AuthenticationScheme));

    private static ClaimsPrincipal CompanyAdminPrincipal() =>
        new(new ClaimsIdentity(
            [new Claim("role", "CompanyAdmin")],
            JwtBearerDefaults.AuthenticationScheme));

    // ── Token cozumleme / baslangic dogrulamasi ─────────────────────────────

    [Fact]
    public void ResolveMetricsScrapeToken_AnahtarTanimsiz_NullDoner()
    {
        Assert.Null(DependencyInjection.ResolveMetricsScrapeToken(Configuration()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ResolveMetricsScrapeToken_BosDeger_NullDoner(string value)
    {
        var configuration = Configuration(("Metrics:ScrapeToken", value));

        Assert.Null(DependencyInjection.ResolveMetricsScrapeToken(configuration));
    }

    [Fact]
    public void ResolveMetricsScrapeToken_KisaToken_BaslangictaReddedilir()
    {
        var configuration = Configuration(("Metrics:ScrapeToken", "kisa-token"));

        var exception = Assert.Throws<InvalidOperationException>(
            () => DependencyInjection.ResolveMetricsScrapeToken(configuration));

        Assert.Contains(
            MetricsScrapeDefaults.MinimumTokenLength.ToString(System.Globalization.CultureInfo.InvariantCulture),
            exception.Message,
            StringComparison.Ordinal);
    }

    [Fact]
    public void ResolveMetricsScrapeToken_SablonToken_BaslangictaReddedilir()
    {
        var configuration = Configuration(("Metrics:ScrapeToken", PlaceholderToken));

        Assert.Throws<InvalidOperationException>(
            () => DependencyInjection.ResolveMetricsScrapeToken(configuration));
    }

    [Fact]
    public void ResolveMetricsScrapeToken_GecerliToken_TrimlenmisDegerDoner()
    {
        var configuration = Configuration(("Metrics:ScrapeToken", $"  {ValidToken}  "));

        Assert.Equal(ValidToken, DependencyInjection.ResolveMetricsScrapeToken(configuration));
    }

    // ── Token karsilastirma ─────────────────────────────────────────────────

    [Fact]
    public void TokensMatch_AyniToken_TrueDoner()
    {
        Assert.True(MetricsScrapeAuthenticationHandler.TokensMatch(ValidToken, ValidToken));
    }

    [Theory]
    [InlineData("Zt7Kq2Wm9Rd4Xs1PbNv6HyGc3JuLf8Ap")] // son karakter farkli, ayni uzunluk
    [InlineData("Zt7Kq2Wm9Rd4Xs1PbNv6HyGc3JuLf8A")]  // kisa
    [InlineData("Zt7Kq2Wm9Rd4Xs1PbNv6HyGc3JuLf8Aoo")] // uzun
    public void TokensMatch_FarkliToken_FalseDoner(string presented)
    {
        Assert.False(MetricsScrapeAuthenticationHandler.TokensMatch(presented, ValidToken));
    }

    // ── Politika davranisi ──────────────────────────────────────────────────

    [Fact]
    public void MetricsPolicy_GecerliScrapeTokenPrincipali_Yetkilendirilir()
    {
        Assert.True(IsAuthorized(ScrapePrincipal()));
    }

    [Fact]
    public void MetricsPolicy_SuperAdmin_ScrapeTokenOlmadanDaYetkilendirilir()
    {
        Assert.True(IsAuthorized(SuperAdminPrincipal()));
    }

    [Fact]
    public void MetricsPolicy_KimliklendirilmemisKullanici_Reddedilir()
    {
        Assert.False(IsAuthorized(new ClaimsPrincipal(new ClaimsIdentity())));
    }

    /// <summary>
    /// Scrape token'i yalnizca metrics kapsamini acar; SuperAdmin dişindaki
    /// roller ve scrape claim'i olmayan JWT'ler bu politikadan gecmez.
    /// </summary>
    [Fact]
    public void MetricsPolicy_CompanyAdmin_Reddedilir()
    {
        Assert.False(IsAuthorized(CompanyAdminPrincipal()));
    }

    /// <summary>
    /// Scrape claim'i SuperAdmin politikasini acmamali — kapsam sizmasi olmamali.
    /// </summary>
    [Fact]
    public async Task SuperAdminPolitikasi_ScrapeTokenPrincipalini_Reddeder()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options =>
            options.AddPolicy("SuperAdmin", policy => policy.RequireClaim("role", "SuperAdmin")));

        using var provider = services.BuildServiceProvider();
        var policy = await provider.GetRequiredService<IAuthorizationPolicyProvider>()
            .GetPolicyAsync("SuperAdmin");

        var result = await provider.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(ScrapePrincipal(), resource: null, policy!);

        Assert.False(result.Succeeded);
    }
}
