using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Jobs;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace CargoPilot.Application.Tests.Jobs;

public sealed class ErpExportJobTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlanId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly ILoadingPlanRepository _planRepository = Substitute.For<ILoadingPlanRepository>();
    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly IErpExportService _erpExportService = Substitute.For<IErpExportService>();
    private readonly ILogger<ErpExportJob> _logger = Substitute.For<ILogger<ErpExportJob>>();

    private ErpExportJob CreateSut() =>
        new(_planRepository, _integrationRepository, _erpExportService, _logger);

    private LoadingPlan ArrangePlan(params Integration[] integrations)
    {
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);
        _integrationRepository.ListByCompanyAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(integrations);
        return plan;
    }

    [Fact]
    public async Task ExecuteAsync_EntegrasyonYoksa_PlanFailedIsaretlenirVeAktarimDenenmez()
    {
        var plan = ArrangePlan();

        await CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
        _integrationRepository.DidNotReceiveWithAnyArgs().AddSyncLog(null!);
        await _erpExportService.DidNotReceiveWithAnyArgs()
            .ExportAsync(null!, null!, Arg.Any<CancellationToken>());
        await _planRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    /// <remarks>Tek entegrasyon kurali: birden fazla baglantida keyfi secim yapilmaz.</remarks>
    [Fact]
    public async Task ExecuteAsync_BirdenFazlaEntegrasyon_KeyfiSecimYapmadanBasarisizOlur()
    {
        var plan = ArrangePlan(
            TestData.CreateIntegration(Guid.NewGuid(), CompanyId),
            TestData.CreateIntegration(Guid.NewGuid(), CompanyId));

        await CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
        await _erpExportService.DidNotReceiveWithAnyArgs()
            .ExportAsync(null!, null!, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_AktarimBasarili_PlanSentIsaretlenirVeSyncLogBasariliDoner()
    {
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        var plan = ArrangePlan(integration);
        _erpExportService.ExportAsync(plan, integration, Arg.Any<CancellationToken>())
            .Returns(Result<int>.Success(4));

        SyncLog? capturedLog = null;
        _integrationRepository.When(repo => repo.AddSyncLog(Arg.Any<SyncLog>()))
            .Do(call => capturedLog = call.Arg<SyncLog>());

        await CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        plan.ErpExportStatus.Should().Be(ErpExportStatus.Sent);
        capturedLog!.Status.Should().Be(SyncLogStatus.Success);
        capturedLog.SyncedRecordCount.Should().Be(4);
    }

    [Fact]
    public async Task ExecuteAsync_AktarimBasarisizsa_SyncLogFailedYazilir()
    {
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        var plan = ArrangePlan(integration);
        _erpExportService.ExportAsync(plan, integration, Arg.Any<CancellationToken>())
            .Returns(Result<int>.Failure(new Error(
                ErrorType.Validation, "Erp.ExportCustomerCodeMissing", "Aktarım tamamlanmadı.")));

        SyncLog? capturedLog = null;
        _integrationRepository.When(repo => repo.AddSyncLog(Arg.Any<SyncLog>()))
            .Do(call => capturedLog = call.Arg<SyncLog>());

        await CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
        capturedLog.Should().NotBeNull();
        capturedLog!.Status.Should().Be(SyncLogStatus.Failed);
        capturedLog.ErrorMessage.Should().Be("Aktarım tamamlanmadı.");
    }

    /// <remarks>
    /// Hangfire AutomaticRetry yalniz exception'da tetiklenir: gecici hata durumu
    /// kaydedildikten sonra exception'a cevrilir ki 3 deneme gercekten calissin.
    /// </remarks>
    [Fact]
    public async Task ExecuteAsync_GeciciHata_DurumKaydedilirVeYenidenDenemeIcinFirlatilir()
    {
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        var plan = ArrangePlan(integration);
        _erpExportService.ExportAsync(plan, integration, Arg.Any<CancellationToken>())
            .Returns(Result<int>.Failure(new Error(
                ErrorType.Unexpected, "Erp.ExportWriteFailed", "ERP bağlantısı koptu.")));

        SyncLog? capturedLog = null;
        _integrationRepository.When(repo => repo.AddSyncLog(Arg.Any<SyncLog>()))
            .Do(call => capturedLog = call.Arg<SyncLog>());

        var act = () => CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        await act.Should().ThrowAsync<ErpExportRetryableException>().WithMessage("*bağlantısı koptu*");
        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
        capturedLog!.Status.Should().Be(SyncLogStatus.Failed);
        await _planRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    /// <remarks>Kalici hatada yeniden deneme kullaniciyi bekletmemeli.</remarks>
    [Fact]
    public async Task ExecuteAsync_KaliciHata_YenidenDenenmez()
    {
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        var plan = ArrangePlan(integration);
        _erpExportService.ExportAsync(plan, integration, Arg.Any<CancellationToken>())
            .Returns(Result<int>.Failure(new Error(
                ErrorType.BusinessRule, "Erp.ExportNoLines", "Aktarılacak satır yok.")));

        var act = () => CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        await act.Should().NotThrowAsync();
        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
    }
}
