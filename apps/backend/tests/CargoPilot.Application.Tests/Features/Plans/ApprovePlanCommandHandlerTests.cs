using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.ApprovePlan;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Plans;

public sealed class ApprovePlanCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlanId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly ILoadingPlanRepository _planRepository = Substitute.For<ILoadingPlanRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly IErpExportJobScheduler _jobScheduler = Substitute.For<IErpExportJobScheduler>();

    private ApprovePlanCommandHandler CreateSut() =>
        new(_planRepository, _currentUserService, _jobScheduler);

    [Fact]
    public async Task Handle_HesaplanmisPlanOnaylaninca_EnqueueTamBirKezCagrilir()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var plan = TestData.CreateCalculatedPlan(PlanId, CompanyId);
        _planRepository.GetByIdAsync(PlanId, CompanyId, Arg.Any<CancellationToken>()).Returns(plan);

        var result = await CreateSut().Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data.Should().Be(PlanId);
        plan.ErpExportStatus.Should().Be(ErpExportStatus.Pending);
        _jobScheduler.Received(1).Enqueue(PlanId, CompanyId);
        await _planRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
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

        var result = await CreateSut().Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

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

        var result = await CreateSut().Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Plan.AlreadyExported");
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }

    [Fact]
    public async Task Handle_SirketBaglamiYokken_AuthNoCompanyDoner()
    {
        _currentUserService.CompanyId.Returns((Guid?)null);

        var result = await CreateSut().Handle(new ApprovePlanCommand(PlanId), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Auth.NoCompany");
        result.Error.Type.Should().Be(ErrorType.Unauthorized);
        _jobScheduler.DidNotReceiveWithAnyArgs().Enqueue(Guid.Empty, Guid.Empty);
    }
}
