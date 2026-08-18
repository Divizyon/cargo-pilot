using CargoPilot.Infrastructure.Security;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Refresh token'larin veritabanina yalnizca hash'lenerek yazildigini sabitler.
/// Ham token asla saklanmaz; dogrulama gelen token'in hash'i uzerinden yapilir.
/// </summary>
public sealed class RefreshTokenHasherTests
{
    private const string SampleToken = "yTLC0Nn0M9pDh0DkTBB0kwFVYIu2BZ0kEEXtQ0TIS6M=";

    [Fact]
    public void Hash_AyniTokenIcin_HerZamanAyniDegeriUretir()
    {
        var first = RefreshTokenHasher.Hash(SampleToken);
        var second = RefreshTokenHasher.Hash(SampleToken);

        Assert.Equal(first, second);
    }

    [Fact]
    public void Hash_HamTokendanFarklidir()
    {
        var hash = RefreshTokenHasher.Hash(SampleToken);

        Assert.NotEqual(SampleToken, hash);
        Assert.DoesNotContain(SampleToken, hash, StringComparison.Ordinal);
    }

    [Fact]
    public void Hash_FarkliTokenlarIcin_FarkliDegerUretir()
    {
        var first = RefreshTokenHasher.Hash(SampleToken);
        var second = RefreshTokenHasher.Hash(SampleToken + "x");

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Hash_KolonUzunluguIle_UyumluHexDondurur()
    {
        var hash = RefreshTokenHasher.Hash(SampleToken);

        Assert.Equal(64, hash.Length);
        Assert.All(hash, ch => Assert.True(char.IsAsciiHexDigitUpper(ch), $"Beklenmeyen karakter: {ch}"));
    }
}
