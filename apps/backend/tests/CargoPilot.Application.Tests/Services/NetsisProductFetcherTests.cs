using System.Text.Json;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Services.Erp;
using CargoPilot.Infrastructure.Services.ErpConnectors;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace CargoPilot.Application.Tests.Services;

/// <summary>
/// Netsis fetcher'inin SQL'i ve baglanti kurulumu davranis-sabitleme testleri
/// (ERP-17/ERP-21): sorgu TBLSTSABIT'e sabit kalir, eksik yapilandirmada varsayilan
/// kimlik bilgisi uydurulmaz.
/// </summary>
public sealed class NetsisProductFetcherTests
{
    private static string CredentialsJson(
        string? database = "MUSTERI_DB",
        string? userId = "erp_okuyucu",
        string? password = "gizli") =>
        JsonSerializer.Serialize(new { Database = database, UserId = userId, Password = password });

    [Fact]
    public void ProviderType_NetsisTir()
    {
        var sut = new NetsisProductFetcher(NullLogger<NetsisProductFetcher>.Instance);

        sut.ProviderType.Should().Be(ErpProviderType.Netsis);
    }

    [Fact]
    public void BuildSql_FiltresizCagri_TbLstsabitSorgusunuKorur()
    {
        var sql = NetsisProductFetcher.BuildSql(hasCategoryFilter: false, hasWarehouseFilter: false);

        sql.Should().Contain("FROM TBLSTSABIT");
        sql.Should().Contain("SATISKILIT IS NULL OR SATISKILIT != 'E'");
        sql.Should().Contain("TOP (@MaxRowCount)");
        sql.Should().Contain("ORDER BY STOK_KODU");
        sql.Should().NotContain("@CategoryFilter");
        sql.Should().NotContain("@WarehouseFilter");
    }

    [Fact]
    public void BuildSql_DepoFiltresi_SqlParametresiOlarakUygulanir()
    {
        var sql = NetsisProductFetcher.BuildSql(hasCategoryFilter: false, hasWarehouseFilter: true);

        sql.Should().Contain("DEPO_KODU AS NVARCHAR(50)) = @WarehouseFilter");
    }

    [Fact]
    public void BuildSql_KategoriFiltresi_SqlParametresiOlarakUygulanir()
    {
        var sql = NetsisProductFetcher.BuildSql(hasCategoryFilter: true, hasWarehouseFilter: false);

        sql.Should().Contain("GRUP_KODU = @CategoryFilter");
    }

    [Fact]
    public void BuildConnectionString_TamKimlikBilgisi_AyarlardanUretilir()
    {
        var connectionString = NetsisProductFetcher.BuildConnectionString("10.0.0.5", CredentialsJson());

        connectionString.Should().Contain("Data Source=10.0.0.5");
        connectionString.Should().Contain("Initial Catalog=MUSTERI_DB");
        connectionString.Should().Contain("User ID=erp_okuyucu");
        connectionString.Should().Contain($"Connect Timeout={ErpSqlConnection.ConnectTimeoutSeconds}");
    }

    [Theory]
    [InlineData(null, "erp_okuyucu", "gizli", "veritabanı")]
    [InlineData("MUSTERI_DB", null, "gizli", "kullanıcı adı")]
    [InlineData("MUSTERI_DB", "erp_okuyucu", null, "parola")]
    public void BuildConnectionString_EksikKimlikBilgisi_VarsayilanUydurmazAciklayiciHataVerir(
        string? database, string? userId, string? password, string beklenenIfade)
    {
        var act = () => NetsisProductFetcher.BuildConnectionString(
            "10.0.0.5", CredentialsJson(database, userId, password));

        act.Should().Throw<ErpConfigurationException>().WithMessage($"*{beklenenIfade}*");
    }

    [Fact]
    public void BuildConnectionString_KimlikBilgisiYok_AciklayiciHataVerir()
    {
        var act = () => NetsisProductFetcher.BuildConnectionString("10.0.0.5", authCredentialsJson: null);

        act.Should().Throw<ErpConfigurationException>().WithMessage("*kimlik bilgileri okunamadı*");
    }

    [Fact]
    public void BuildConnectionString_BozukJson_YutulmazHataVerir()
    {
        var act = () => NetsisProductFetcher.BuildConnectionString("10.0.0.5", "{bozuk-json");

        act.Should().Throw<ErpConfigurationException>();
    }

    [Fact]
    public void BuildConnectionString_SunucuAdresiYok_AciklayiciHataVerir()
    {
        var act = () => NetsisProductFetcher.BuildConnectionString(" ", CredentialsJson());

        act.Should().Throw<ErpConfigurationException>().WithMessage("*sunucu adresi*");
    }

    [Fact]
    public void Connectorler_SaglayiciTipleriniAyirir()
    {
        new NetsisErpConnector().ProviderType.Should().Be(ErpProviderType.Netsis);
        new LogoErpConnector().ProviderType.Should().Be(ErpProviderType.Logo);
    }
}
