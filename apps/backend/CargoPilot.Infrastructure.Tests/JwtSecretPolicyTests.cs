namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Zayif veya sablon JWT secret'lariyla uygulamanin baslamamasini sabitler.
/// SEC-06: taban appsettings.json'daki varsayilan secret kaldirildi; kalan koruma bu politika.
/// </summary>
public sealed class JwtSecretPolicyTests
{
    private const string RealSecret = "Qv7m2XeR9pLd4KsA1zTgYu6BnC3jHw8F";

    [Theory]
    [InlineData("dev-only-secret-replace-with-env-var-in-staging-and-prod!!")]
    [InlineData("please-changeme-before-production-deployment-xx")]
    [InlineData("please-change-me-before-production-deployment")]
    [InlineData("PLEASE_CHANGE_ME_BEFORE_PRODUCTION_DEPLOYMENT")]
    [InlineData("your-secret-goes-right-here-and-is-long-enough")]
    [InlineData("this-is-a-placeholder-value-for-local-runs-only")]
    public void LooksLikePlaceholder_BilinenSablonParcalari_Reddedilir(string secret)
    {
        Assert.True(JwtSecretPolicy.LooksLikePlaceholder(secret));
    }

    /// <summary>
    /// infra/env/*.example dosyalari placeholder'lari &lt;ACIKLAMA&gt; biciminde yaziyor.
    /// Bu bicim parca listesine takilmasa bile reddedilmeli.
    /// </summary>
    [Theory]
    [InlineData("<CHANGE_ME_JWT_SECRET_MIN_32_CHARS>")]
    [InlineData("  <SOME_OTHER_LONG_PLACEHOLDER_VALUE_HERE>  ")]
    public void LooksLikePlaceholder_AciliParantezliDeger_Reddedilir(string secret)
    {
        Assert.True(JwtSecretPolicy.LooksLikePlaceholder(secret));
    }

    [Fact]
    public void LooksLikePlaceholder_GercekSecret_KabulEdilir()
    {
        Assert.False(JwtSecretPolicy.LooksLikePlaceholder(RealSecret));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("kisa-secret")]
    public void HasSufficientLength_BosVeyaKisaDeger_Reddedilir(string secret)
    {
        Assert.False(JwtSecretPolicy.HasSufficientLength(secret));
    }

    [Fact]
    public void HasSufficientLength_MinimumUzunluktakiSecret_KabulEdilir()
    {
        Assert.Equal(JwtSecretPolicy.MinimumLength, RealSecret.Length);
        Assert.True(JwtSecretPolicy.HasSufficientLength(RealSecret));
    }
}
