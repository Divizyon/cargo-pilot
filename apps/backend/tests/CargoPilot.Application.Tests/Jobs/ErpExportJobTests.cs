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

    [Fact]
    public async Task ExecuteAsync_EntegrasyonYoksa_PlanFailedIsaretlenirVeAktarimDenenmez()
    {
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);
        _integrationRepository.ListByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Integration>());

        await CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
        _integrationRepository.DidNotReceiveWithAnyArgs().AddSyncLog(null!);
        await _erpExportService.DidNotReceiveWithAnyArgs()
            .ExportAsync(null!, null!, Arg.Any<CancellationToken>());
        await _planRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_AktarimBasarisizsa_SyncLogFailedYazilir()
    {
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);
        _integrationRepository.ListByCompanyAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(new[] { integration });
        _erpExportService.ExportAsync(plan, integration, Arg.Any<CancellationToken>())
            .Returns(Result<int>.Failure(new Error(
                ErrorType.Unexpected, "Erp.ExportNotImplemented", "Aktarım tamamlanmadı.")));

        SyncLog? capturedLog = null;
        _integrationRepository.When(repo => repo.AddSyncLog(Arg.Any<SyncLog>()))
            .Do(call => capturedLog = call.Arg<SyncLog>());

        await CreateSut().ExecuteAsync(PlanId, CompanyId, CancellationToken.None);

        plan.ErpExportStatus.Should().Be(ErpExportStatus.Failed);
        capturedLog.Should().NotBeNull();
        capturedLog!.Status.Should().Be(SyncLogStatus.Failed);
        capturedLog.ErrorMessage.Should().Be("Aktarım tamamlanmadı.");
    }
}
