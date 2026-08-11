using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Services.Erp;
using CargoPilot.Infrastructure.Services.ErpConnectors;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace CargoPilot.Application.Tests.Services;

/// <summary>
/// Netsis fetcher'inin SQL'i ve ERP baglanti kurulumu davranis-sabitleme testleri
/// (ERP-17/ERP-21/ERP-22): sorgu TBLSTSABIT'e sabit kalir, eksik yapilandirmada
/// varsayilan kimlik bilgisi uydurulmaz, sifre maskelenir ve sertifika dogrulamasi
/// ayardan gelir.
/// </summary>
public sealed class NetsisProductFetcherTests
{
    private static ErpCredentials Credentials(bool trustServerCertificate = true) =>
        ErpCredentials.Create("MUSTERI_DB", "erp_okuyucu", "gizli", trustServerCertificate);

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
    public void Build_TamKimlikBilgisi_AyarlardanUretilir()
    {
        var connectionString = ErpSqlConnection.Build("10.0.0.5", Credentials());

        connectionString.Should().Contain("Data Source=10.0.0.5");
        connectionString.Should().Contain("Initial Catalog=MUSTERI_DB");
        connectionString.Should().Contain("User ID=erp_okuyucu");
        connectionString.Should().Contain($"Connect Timeout={ErpSqlConnection.ConnectTimeoutSeconds}");
    }

    [Fact]
    public void Build_SertifikaDogrulamasiAcik_TrustServerCertificateFalseYazilir()
    {
        var connectionString = ErpSqlConnection.Build("10.0.0.5", Credentials(trustServerCertificate: false));

        connectionString.Should().Contain("Trust Server Certificate=False");
        connectionString.Should().Contain("Encrypt=True");
    }

    [Fact]
    public void Build_SertifikaDogrulamasiKapali_TrustServerCertificateTrueYazilir()
    {
        var connectionString = ErpSqlConnection.Build("10.0.0.5", Credentials(trustServerCertificate: true));

        connectionString.Should().Contain("Trust Server Certificate=True");
    }

    [Theory]
    [InlineData(null, "erp_okuyucu", "gizli", "veritabanı")]
    [InlineData("MUSTERI_DB", null, "gizli", "kullanıcı adı")]
    [InlineData("MUSTERI_DB", "erp_okuyucu", null, "parola")]
    public void Create_EksikKimlikBilgisi_VarsayilanUydurmazAciklayiciHataVerir(
        string? database, string? userId, string? password, string beklenenIfade)
    {
        var act = () => ErpCredentials.Create(database, userId, password);

        act.Should().Throw<ErpConfigurationException>().WithMessage($"*{beklenenIfade}*");
    }

    [Fact]
    public void ToString_SifreyiMaskeler()
    {
        var metin = ErpCredentials.Create("MUSTERI_DB", "erp_okuyucu", "cok-gizli-parola").ToString();

        metin.Should().NotContain("cok-gizli-parola");
        metin.Should().Contain("***");
        metin.Should().Contain("MUSTERI_DB");
    }

    [Fact]
    public void Build_SunucuAdresiYok_AciklayiciHataVerir()
    {
        var act = () => ErpSqlConnection.Build(" ", Credentials());

        act.Should().Throw<ErpConfigurationException>().WithMessage("*sunucu adresi*");
    }

    [Fact]
    public void Connectorler_SaglayiciTipleriniAyirir()
    {
        new NetsisErpConnector().ProviderType.Should().Be(ErpProviderType.Netsis);
        new LogoErpConnector().ProviderType.Should().Be(ErpProviderType.Logo);
    }
}
