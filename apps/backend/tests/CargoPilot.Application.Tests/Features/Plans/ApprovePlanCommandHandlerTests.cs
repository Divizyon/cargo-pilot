using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Plans.ApprovePlan;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Plans;

public sealed class ApprovePlanCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlanId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly ILoadingPlanRepository _planRepository = Substitute.For<ILoadingPlanRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly IErpExportJobScheduler _jobScheduler = Substitute.For<IErpExportJobScheduler>();

    private ApprovePlanCommandHandler CreateSut(bool exportEnabled, string? customerCode = "120-001") =>
        new(
            _planRepository,
            _currentUserService,
            _integrationRepository,
            _jobScheduler,
            Options.Create(new ErpExportSettings { ExportEnabled = exportEnabled, CustomerCode = customerCode }));

    [Fact]
    public async Task Handle_AktarimAcikVeEntegrasyonVarsa_EnqueueTamBirKezCagrilir()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);
        _integrationRepository.ExistsByCompanyAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await CreateSut(exportEnabled: true)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.PlanId.Should().Be(PlanId);
        result.Data.ErpExportQueued.Should().BeTrue();
        plan.ErpExportStatus.Should().Be(ErpExportStatus.Pending);
        _jobScheduler.Received(1).Enqueue(PlanId, CompanyId);
        await _planRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_AktarimKapaliyken_EnqueueCagrilmazVeErpDurumuDegismez()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);

        var result = await CreateSut(exportEnabled: false)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.ErpExportQueued.Should().BeFalse();
        plan.ErpExportStatus.Should().BeNull();
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
        await _planRepository.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_AktarimAcikAmaEntegrasyonYoksa_AciklayiciHataDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);
        _integrationRepository.ExistsByCompanyAsync(CompanyId, Arg.Any<CancellationToken>()).Returns(false);

        var result = await CreateSut(exportEnabled: true)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.NoIntegration");
        result.Error.Type.Should().Be(ErrorType.BusinessRule);
        result.Error.Description.Should().NotBeNullOrWhiteSpace();
        plan.ErpExportStatus.Should().BeNull();
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }

    /// <remarks>ERP-18: cari kodu olmadan siparis yazilamaz; neden onay aninda gorunur.</remarks>
    [Fact]
    public async Task Handle_CariKoduTanimsizsa_AciklayiciHataDonerVeEnqueueCagrilmaz()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);

        var result = await CreateSut(exportEnabled: true, customerCode: null)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportNotConfigured");
        plan.ErpExportStatus.Should().BeNull();
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }

    [Fact]
    public async Task Handle_PlanHesaplanmamissa_EnqueueCagrilmaz()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = new LoadingPlan(
            PlanId,
            "Taslak Plan",
            Guid.NewGuid(),
            LoadingPlanOptimizationCriteria.VolumeFirst,
            inputTotalQuantity: 1,
            CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);

        var result = await CreateSut(exportEnabled: true)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Plan.NotCalculated");
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }

    [Fact]
    public async Task Handle_PlanZatenAktarilmissa_EnqueueCagrilmaz()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        plan.MarkErpSent();
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);

        var result = await CreateSut(exportEnabled: true)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Plan.AlreadyExported");
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }

    [Fact]
    public async Task Handle_SirketBaglamiYokken_AuthNoCompanyDoner()
    {
        _currentUserService.CompanyId.Returns((Guid?)null);

        var result = await CreateSut(exportEnabled: true)
            .Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Auth.NoCompany");
        result.Error.Type.Should().Be(ErrorType.Unauthorized);
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }
}
