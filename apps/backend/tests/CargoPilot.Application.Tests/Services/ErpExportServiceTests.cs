using System.Data.Common;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace CargoPilot.Application.Tests.Services;

/// <summary>
/// ERP-18 aktarim davranisi: plandaki yerlesimler Netsis siparisine cevrilir, siparis
/// numarasi plandan deterministik uretilir (idempotency), yapilandirma hatalari kalici
/// (Validation/BusinessRule), teknik hatalar yeniden denenebilir (Unexpected) doner.
/// </summary>
public sealed class ErpExportServiceTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlanId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly IErpSettingsRepository _erpSettingsRepository = Substitute.For<IErpSettingsRepository>();
    private readonly IErpPasswordProtector _passwordProtector = Substitute.For<IErpPasswordProtector>();
    private readonly ILoadingPlanRepository _planRepository = Substitute.For<ILoadingPlanRepository>();
    private readonly IErpOrderWriter _orderWriter = Substitute.For<IErpOrderWriter>();

    public ErpExportServiceTests()
    {
        _passwordProtector.Unprotect(Arg.Any<string>()).Returns("gizli");
        _orderWriter.ProviderType.Returns(ErpProviderType.Netsis);
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateErpSettings(CompanyId));
        _planRepository.GetErpExportLinesAsync(PlanId, Arg.Any<CancellationToken>())
            .Returns(new List<PlanErpExportLine>
            {
                new("ERP-1", "SKU-1", "Koli", 3),
                new(null, "SKU-2", "Varil", 2)
            });
        _orderWriter.WriteOrderAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<ErpOrderDocument>(), Arg.Any<CancellationToken>())
            .Returns(call => ErpOrderWriteResult.Written(call.Arg<ErpOrderDocument>().Lines.Count));
    }

    private ErpExportService CreateSut(
        ErpExportSettings? exportSettings = null,
        params IErpOrderWriter[] writers) =>
        new(_erpSettingsRepository,
            _passwordProtector,
            _planRepository,
            writers.Length > 0 ? writers : [_orderWriter],
            Options.Create(exportSettings ?? DefaultExportSettings()));

    private static ErpExportSettings DefaultExportSettings() =>
        new() { ExportEnabled = true, CustomerCode = "120-001", OrderNumberPrefix = "CP" };

    private Task<Result<int>> ExportAsync(ErpExportSettings? exportSettings = null, params IErpOrderWriter[] writers) =>
        CreateSut(exportSettings, writers).ExportAsync(
            TestData.CreateCalculatedPlan(PlanId, CompanyId),
            TestData.CreateIntegration(Guid.NewGuid(), CompanyId),
            CancellationToken.None);

    [Fact]
    public async Task ExportAsync_YerlesimVarsa_SiparisYazilirVeSatirSayisiDoner()
    {
        ErpOrderDocument? yazilan = null;
        _orderWriter.WriteOrderAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<ErpOrderDocument>(), Arg.Any<CancellationToken>())
            .Returns(call =>
            {
                yazilan = call.Arg<ErpOrderDocument>();
                return ErpOrderWriteResult.Written(yazilan.Lines.Count);
            });

        var result = await ExportAsync();

        result.IsSuccess.Should().BeTrue();
        result.Data.Should().Be(2);
        yazilan.Should().NotBeNull();
        yazilan!.CustomerCode.Should().Be("120-001");
        yazilan.Lines.Should().HaveCount(2);
        yazilan.Lines[0].ProductCode.Should().Be("ERP-1");
        yazilan.Lines[0].Quantity.Should().Be(3);
    }

    /// <remarks>ErpId yoksa stok kodu SKU'dan alinir; satir sessizce dusurulmez.</remarks>
    [Fact]
    public async Task ExportAsync_ErpIdOlmayanUrun_StokKoduSkudanAlinir()
    {
        ErpOrderDocument? yazilan = null;
        _orderWriter.WriteOrderAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<ErpOrderDocument>(), Arg.Any<CancellationToken>())
            .Returns(call =>
            {
                yazilan = call.Arg<ErpOrderDocument>();
                return ErpOrderWriteResult.Written(yazilan.Lines.Count);
            });

        await ExportAsync();

        yazilan!.Lines[1].ProductCode.Should().Be("SKU-2");
    }

    /// <remarks>Idempotency: ayni plan ayni siparis numarasini uretir.</remarks>
    [Fact]
    public void BuildOrderNumber_AyniPlan_HerZamanAyniNumarayiUretir()
    {
        var birinci = ErpExportService.BuildOrderNumber("CP", PlanId);
        var ikinci = ErpExportService.BuildOrderNumber("CP", PlanId);

        birinci.Should().Be(ikinci);
        birinci.Should().StartWith("CP-");
        ErpExportService.BuildOrderNumber("CP", Guid.NewGuid()).Should().NotBe(birinci);
    }

    /// <remarks>Ikinci aktarimda ERP'de kayit bulunur; mukerrer satir yazilmaz.</remarks>
    [Fact]
    public async Task ExportAsync_SiparisZatenVarsa_MukerrerKayitYazilmazVeBasariDoner()
    {
        _orderWriter.WriteOrderAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<ErpOrderDocument>(), Arg.Any<CancellationToken>())
            .Returns(ErpOrderWriteResult.AlreadyExists());

        var result = await ExportAsync();

        result.IsSuccess.Should().BeTrue();
        result.Data.Should().Be(0);
        result.Message.Should().Contain("zaten mevcut");
    }

    [Fact]
    public async Task ExportAsync_ErpAyariYoksa_KaliciHataDoner()
    {
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns((Domain.Entities.ErpSettings?)null);

        var result = await ExportAsync();

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.SettingsNotConfigured");
        result.Error.Type.Should().Be(ErrorType.Validation);
    }

    /// <remarks>Logo icin yazici kaydi yok; Netsis semasina yazma denenmez.</remarks>
    [Fact]
    public async Task ExportAsync_SaglayiciyaYaziciYoksa_AktarimHicDenenmez()
    {
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateErpSettings(CompanyId, ErpProviderType.Logo));

        var result = await ExportAsync();

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportProviderNotSupported");
        result.Error.Description.Should().Contain("Logo");
        await _orderWriter.DidNotReceiveWithAnyArgs().WriteOrderAsync(null!, null!, null!, default);
    }

    [Fact]
    public async Task ExportAsync_CariKoduTanimsiz_KaliciHataDoner()
    {
        var result = await ExportAsync(new ErpExportSettings { ExportEnabled = true, CustomerCode = " " });

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportCustomerCodeMissing");
        await _orderWriter.DidNotReceiveWithAnyArgs().WriteOrderAsync(null!, null!, null!, default);
    }

    [Fact]
    public async Task ExportAsync_PlandaYerlesimYok_IsKuraliHatasiDoner()
    {
        _planRepository.GetErpExportLinesAsync(PlanId, Arg.Any<CancellationToken>())
            .Returns(new List<PlanErpExportLine>());

        var result = await ExportAsync();

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportNoLines");
        result.Error.Type.Should().Be(ErrorType.BusinessRule);
    }

    /// <remarks>Veritabani hatasi gecicidir; job yeniden denesin diye Unexpected doner.</remarks>
    [Fact]
    public async Task ExportAsync_VeritabaniHatasi_YenidenDenenebilirHataDoner()
    {
        _orderWriter.WriteOrderAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<ErpOrderDocument>(), Arg.Any<CancellationToken>())
            .Returns<ErpOrderWriteResult>(_ => throw new TestDbException("baglanti koptu"));

        var result = await ExportAsync();

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportWriteFailed");
        result.Error.Type.Should().Be(ErrorType.Unexpected);
    }

    /// <remarks>Yapilandirma hatasi kalicidir; yeniden deneme kullaniciyi bekletmemeli.</remarks>
    [Fact]
    public async Task ExportAsync_EksikYapilandirma_KaliciHataDoner()
    {
        _orderWriter.WriteOrderAsync(
                Arg.Any<string>(), Arg.Any<ErpCredentials>(), Arg.Any<ErpOrderDocument>(), Arg.Any<CancellationToken>())
            .Returns<ErpOrderWriteResult>(_ => throw new ErpConfigurationException("ERP sunucu adresi tanımlı değil."));

        var result = await ExportAsync();

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportConfigurationInvalid");
        result.Error.Type.Should().Be(ErrorType.Validation);
    }

    private sealed class TestDbException : DbException
    {
        public TestDbException(string message) : base(message)
        {
        }
    }
}
